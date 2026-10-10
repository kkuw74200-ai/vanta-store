const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "";
const ADMIN_KEY = process.env.VANTA_ADMIN_KEY || "";

const DATA_DIR = path.join(__dirname, "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const VISITS_FILE = path.join(DATA_DIR, "visits.json");

fs.mkdirSync(DATA_DIR, { recursive: true });

for (const file of [ORDERS_FILE, VISITS_FILE]) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "[]", "utf8");
  }
}

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));
app.use(express.static(__dirname));

function readJSON(file) {
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

function clean(value, max = 2000) {
  return String(value ?? "").trim().slice(0, max);
}

function requireAdmin(req, res, next) {
  const provided = Buffer.from(req.get("x-admin-key") || "");
  const expected = Buffer.from(ADMIN_KEY);

  if (!ADMIN_KEY) {
    return res.status(503).json({
      error: "أضف VANTA_ADMIN_KEY في إعدادات Render"
    });
  }

  if (
    provided.length !== expected.length ||
    !crypto.timingSafeEqual(provided, expected)
  ) {
    return res.status(401).json({
      error: "مفتاح الإدارة غير صحيح"
    });
  }

  next();
}

function createOrderId(orders) {
  let orderId;

  do {
    orderId = "VANTA-" + crypto.randomInt(10000, 100000);
  } while (orders.some(order => order.orderId === orderId));

  return orderId;
}

async function sendDiscordOrder(order) {
  if (!WEBHOOK_URL) {
    console.log("تنبيه: DISCORD_WEBHOOK_URL غير مضبوط");
    return;
  }

  const embed = {
    title: "🟣 طلب جديد — VANTA",
    color: 10181046,
    fields: [
      {
        name: "🎫 رقم الطلب",
        value: order.orderId,
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
        value: `${order.budget} ${order.currency}`,
        inline: true
      },
      {
        name: "🌍 الدولة",
        value: order.country,
        inline: true
      },
      {
        name: "⚡ سرعة التنفيذ",
        value: order.speed,
        inline: true
      },
      {
        name: "📝 التفاصيل",
        value: order.description.slice(0, 1000) || "لا توجد تفاصيل"
      },
      {
        name: "🔗 الرابط المرجعي",
        value: order.reference || "لا يوجد"
      }
    ],
    footer: {
      text: "VANTA Digital Studio"
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
    throw new Error("فشل إرسال الطلب إلى Discord: " + response.status);
  }
}

/* تسجيل الزيارات */

app.post("/api/visit", (req, res) => {
  const visits = readJSON(VISITS_FILE);
  const userAgent = String(req.get("user-agent") || "").toLowerCase();

  let device = "desktop";

  if (/ipad|tablet|android(?!.*mobile)/.test(userAgent)) {
    device = "tablet";
  } else if (/mobile|iphone|ipod|android/.test(userAgent)) {
    device = "mobile";
  }

  visits.push({
    timestamp: new Date().toISOString(),
    date: new Date().toISOString().slice(0, 10),
    device
  });

  saveJSON(VISITS_FILE, visits);

  res.json({ success: true });
});

/* إنشاء طلب */

app.post("/api/orders", async (req, res) => {
  const service = clean(req.body.service, 100);
  const projectName = clean(req.body.projectName, 100);
  const description = clean(req.body.description, 2000);
  const reference = clean(req.body.reference, 500);
  const speed = clean(req.body.speed, 50) || "حسب الاتفاق";
  const currency = clean(req.body.currency, 10) || "KWD";
  const country = clean(req.body.country, 10) || "KW";
  const budget = Number(req.body.budget);

  const supportedCurrencies = [
    "KWD", "SAR", "AED", "QAR", "BHD",
    "OMR", "USD", "GBP", "EGP"
  ];

  const supportedCountries = [
    "KW", "SA", "AE", "QA", "BH",
    "OM", "US", "GB", "EG"
  ];

  if (
    !service ||
    !projectName ||
    !description ||
    !Number.isFinite(budget) ||
    budget <= 0 ||
    !supportedCurrencies.includes(currency) ||
    !supportedCountries.includes(country)
  ) {
    return res.status(400).json({
      error: "تأكد من صحة بيانات الطلب والميزانية والدولة"
    });
  }

  const orders = readJSON(ORDERS_FILE);

  const order = {
    orderId: createOrderId(orders),
    service,
    projectName,
    description,
    reference: reference || "لا يوجد",
    speed,
    budget,
    currency,
    country,
    status: "بانتظار المراجعة",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  orders.push(order);
  saveJSON(ORDERS_FILE, orders);

  try {
    await sendDiscordOrder(order);
  } catch (error) {
    console.error("Discord webhook:", error.message);
  }

  res.status(201).json({
    success: true,
    orderId: order.orderId,
    status: order.status
  });
});

/* متابعة الطلب — معلومات محدودة */

app.get("/api/orders/:id", (req, res) => {
  const id = clean(req.params.id, 30).toUpperCase();
  const orders = readJSON(ORDERS_FILE);
  const order = orders.find(item => item.orderId === id);

  if (!order) {
    return res.status(404).json({
      error: "لم يتم العثور على الطلب"
    });
  }

  res.json({
    orderId: order.orderId,
    service: order.service,
    projectName: order.projectName,
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  });
});

/* إحصائيات الإدارة */

app.get("/api/admin/stats", requireAdmin, (req, res) => {
  const orders = readJSON(ORDERS_FILE);
  const visits = readJSON(VISITS_FILE);
  const today = new Date().toISOString().slice(0, 10);

  res.json({
    totalOrders: orders.length,
    pending: orders.filter(
      order => order.status === "بانتظار المراجعة"
    ).length,
    inProgress: orders.filter(
      order => order.status === "قيد التنفيذ"
    ).length,
    completed: orders.filter(
      order => order.status === "مكتمل"
    ).length,
    totalVisits: visits.length,
    todayVisits: visits.filter(
      visit => visit.date === today
    ).length
  });
});

/* عرض الطلبات للإدارة */

app.get("/api/admin/orders", requireAdmin, (req, res) => {
  const orders = readJSON(ORDERS_FILE);

  res.json(orders.slice().reverse());
});

/* تحديث حالة الطلب */

app.patch("/api/admin/orders/:id", requireAdmin, (req, res) => {
  const allowedStatuses = [
    "بانتظار المراجعة",
    "قيد التنفيذ",
    "بانتظار العميل",
    "مكتمل",
    "ملغي"
  ];

  const status = clean(req.body.status, 50);
  const orders = readJSON(ORDERS_FILE);

  const order = orders.find(
    item => item.orderId === req.params.id
  );

  if (!order) {
    return res.status(404).json({
      error: "الطلب غير موجود"
    });
  }

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      error: "حالة الطلب غير صحيحة"
    });
  }

  order.status = status;
  order.updatedAt = new Date().toISOString();

  saveJSON(ORDERS_FILE, orders);

  res.json({
    success: true,
    orderId: order.orderId,
    status: order.status
  });
});

/* تشغيل السيرفر */

app.listen(PORT, () => {
  console.log(`VANTA يعمل على المنفذ ${PORT}`);
});
