const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const ADMIN_KEY = process.env.VANTA_ADMIN_KEY;

const DATA_DIR = path.join(__dirname, "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const VISITS_FILE = path.join(DATA_DIR, "visits.json");

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(ORDERS_FILE)) {
    fs.writeFileSync(ORDERS_FILE, "[]", "utf8");
}

if (!fs.existsSync(VISITS_FILE)) {
    fs.writeFileSync(VISITS_FILE, "[]", "utf8");
}

app.use(express.json({ limit: "2mb" }));
app.use(express.static(__dirname));

function readOrders() {
    try {
        return JSON.parse(
            fs.readFileSync(ORDERS_FILE, "utf8")
        );
    } catch {
        return [];
    }
}

function saveOrders(orders) {
    fs.writeFileSync(
        ORDERS_FILE,
        JSON.stringify(orders, null, 2),
        "utf8"
    );
}

function readVisits() {
    try {
        return JSON.parse(
            fs.readFileSync(VISITS_FILE, "utf8")
        );
    } catch {
        return [];
    }
}

function saveVisits(visits) {
    fs.writeFileSync(
        VISITS_FILE,
        JSON.stringify(visits, null, 2),
        "utf8"
    );
}

function createOrderId() {
    return `VANTA-${Math.floor(10000 + Math.random() * 90000)}`;
}

function getDevice(req) {
    const userAgent = String(req.headers["user-agent"] || "").toLowerCase();

    if (/tablet|ipad|android(?!.*mobile)/i.test(userAgent)) {
        return "tablet";
    }

    if (/mobile|iphone|ipod|android/i.test(userAgent)) {
        return "mobile";
    }

    return "desktop";
}

async function sendDiscordOrder(order) {

    if (!WEBHOOK_URL) {
        console.log("❌ DISCORD_WEBHOOK_URL غير موجود");
        return;
    }

    const embed = {
        title: "🟣 طلب جديد — VANTA",
        color: 7121919,
        fields: [
            {
                name: "🎫 رقم الطلب",
                value: `\`${order.orderId}\``,
                inline: true
            },
            {
                name: "🛠️ الخدمة",
                value: order.service,
                inline: true
            },
            {
                name: "📁 المشروع",
                value: order.projectName,
                inline: true
            },
            {
                name: "💰 الميزانية",
                value: order.budget,
                inline: true
            },
            {
                name: "⚡ السرعة",
                value: order.speed || "غير محدد",
                inline: true
            },
            {
                name: "📝 التفاصيل",
                value: order.description.slice(0, 1024)
            },
            {
                name: "🔗 المرجع",
                value: order.reference || "لا يوجد"
            }
        ],
        footer: {
            text: "VANTA • Discord Services & Programming"
        },
        timestamp: order.createdAt
    };

    const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: "VANTA",
            embeds: [embed]
        })
    });

    if (!response.ok) {
        console.log(
            "❌ فشل إرسال الطلب للديسكورد:",
            response.status
        );
    } else {
        console.log(
            `✅ تم إرسال ${order.orderId} للديسكورد`
        );
    }
}

/* =========================
   تسجيل الزيارات
========================= */

app.post("/api/visit", (req, res) => {

    const visits = readVisits();

    const now = new Date();

    visits.push({
        timestamp: now.toISOString(),
        date: now.toISOString().slice(0, 10),
        device: getDevice(req)
    });

    saveVisits(visits);

    res.json({
        success: true
    });
});

/* =========================
   الإحصائيات
========================= */

app.get("/api/stats", (req, res) => {

    if (!ADMIN_KEY) {
        return res.status(500).json({
            error: "VANTA_ADMIN_KEY غير موجود في Environment Variables"
        });
    }

    const providedKey = req.headers["x-admin-key"];

    if (!providedKey || providedKey !== ADMIN_KEY) {
        return res.status(401).json({
            error: "مفتاح الإدارة غير صحيح"
        });
    }

    const visits = readVisits();
    const orders = readOrders();

    const now = Date.now();

    const today = new Date()
        .toISOString()
        .slice(0, 10);

    const totalVisits = visits.length;

    const todayVisits = visits.filter(
        visit => visit.date === today
    ).length;

    const activeVisitors = visits.filter(visit => {
        const time = new Date(visit.timestamp).getTime();

        return (
            now - time <= 5 * 60 * 1000
        );
    }).length;

    const mobile = visits.filter(
        visit => visit.device === "mobile"
    ).length;

    const desktop = visits.filter(
        visit => visit.device === "desktop"
    ).length;

    const tablet = visits.filter(
        visit => visit.device === "tablet"
    ).length;

    const recent = [...orders]
        .reverse()
        .slice(0, 10)
        .map(order => ({
            orderId: order.orderId,
            service: order.service,
            projectName: order.projectName,
            budget: order.budget,
            status: order.status,
            createdAt: order.createdAt
        }));

    res.json({
        totalVisits,
        todayVisits,
        activeVisitors,
        mobile,
        desktop,
        tablet,
        totalOrders: orders.length,
        recent
    });
});

/* =========================
   الطلبات
========================= */

app.post("/api/orders", async (req, res) => {

    const {
        service,
        projectName,
        description,
        reference,
        speed,
        budget
    } = req.body;

    if (
        !service ||
        !projectName ||
        !description ||
        !budget
    ) {
        return res.status(400).json({
            error: "بيانات الطلب ناقصة"
        });
    }

    const orders = readOrders();

    let orderId = createOrderId();

    while (
        orders.some(order => order.orderId === orderId)
    ) {
        orderId = createOrderId();
    }

    const order = {
        orderId,
        service,
        projectName,
        description,
        reference: reference || "لا يوجد",
        speed: speed || "غير محدد",
        budget,
        status: "🟡 بانتظار المراجعة",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    orders.push(order);

    saveOrders(orders);

    try {
        await sendDiscordOrder(order);
    } catch (error) {
        console.log(
            "❌ خطأ Webhook:",
            error.message
        );
    }

    res.status(201).json({
        success: true,
        orderId: order.orderId,
        status: order.status
    });
});

/* =========================
   جلب طلب معين
========================= */

app.get("/api/orders/:id", (req, res) => {

    const orders = readOrders();

    const order = orders.find(
        item => item.orderId === req.params.id
    );

    if (!order) {
        return res.status(404).json({
            error: "الطلب غير موجود"
        });
    }

    res.json(order);
});

/* =========================
   تشغيل السيرفر
========================= */

app.listen(PORT, () => {
    console.log(`🚀 VANTA يعمل على المنفذ ${PORT}`);
});
