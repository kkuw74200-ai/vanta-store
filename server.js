const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

const DATA_DIR = path.join(__dirname, "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(ORDERS_FILE)) {
    fs.writeFileSync(ORDERS_FILE, "[]", "utf8");
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

function createOrderId() {
    return `VANTA-${Math.floor(10000 + Math.random() * 90000)}`;
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

app.listen(PORT, () => {
    console.log(`🚀 VANTA يعمل على المنفذ ${PORT}`);
});