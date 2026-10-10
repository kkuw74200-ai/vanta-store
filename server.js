"use strict";

const express = require("express");
const session = require("express-session");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const VISITS_FILE = path.join(DATA_DIR, "visits.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");

const ADMIN_KEY = process.env.VANTA_ADMIN_KEY || "";
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "";

const CLIENT_ID = process.env.DISCORD_CLIENT_ID || "";
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || "";
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || "";
const SESSION_SECRET = process.env.SESSION_SECRET || "";

fs.mkdirSync(DATA_DIR, { recursive: true });

for (const file of [ORDERS_FILE, VISITS_FILE, USERS_FILE]) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "[]", "utf8");
  }
}

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

if (!SESSION_SECRET) {
  console.warn("تحذير: أضف SESSION_SECRET في Render");
}

app.use(session({
  name: "vanta.sid",
  secret: SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

app.use(express.static(__dirname));

function readJSON(file) {
  try {
    const value = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveJSON(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
}

function clean(value, max = 2000) {
  return String(value ?? "").trim().slice(0, max);
}

function requireAdmin(req, res, next) {
  const provided = Buffer.from(req.get("x-admin-key") || "");
  const expected = Buffer.from(ADMIN_KEY);

  if (!ADMIN_KEY) {
    return res.status(503).json({
      error: "إعداد مفتاح الإدارة غير مكتمل"
    });
  }

  if (
    provided.length !== expected.length ||
    !crypto.timingSafeEqual(provided, expected)
  ) {
    return res.status(401).json({
      error: "غير مصرح لك"
    });
  }

  next();
}

function requireDiscord(req, res, next) {
  if (!req.session.discordUser) {
    return res.status(401).json({
      error: "سجّل دخولك بواسطة Discord أولًا"
    });
  }

  next();
}

/* =========================
   تسجيل الدخول بواسطة Discord
========================= */

app.get("/auth/discord", (req, res) => {
  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI || !SESSION_SECRET) {
    return res.status(503).send(
      "تسجيل الدخول غير جاهز. تأكد من إعدادات Discord في Render."
    );
  }

  const state = crypto.randomBytes(24).toString("hex");

  req.session.oauthState = state;

  req.session.save(error => {
    if (error) {
      return res.status(500).send("تعذر بدء تسجيل الدخول");
    }

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: "code",
      redirect_uri: REDIRECT_URI,
      scope: "identify",
      state
    });

    res.redirect(
      "https://discord.com/oauth2/authorize?" + params.toString()
    );
  });
});

/* =========================
   استقبال رد Discord
========================= */

app.get("/auth/discord/callback", async (req, res) => {
  const code = clean(req.query.code, 2000);
  const state = clean(req.query.state, 200);
  const savedState = req.session.oauthState;

  delete req.session.oauthState;

  if (
    !code ||
    !state ||
    !savedState ||
    state !== savedState
  ) {
    return res.status(400).send(
      "تعذر التحقق من تسجيل الدخول. حاول مرة أخرى."
    );
  }

  try {
    const tokenResponse = await fetch(
      "https://discord.com/api/oauth2/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          grant_type: "authorization_code",
          code,
          redirect_uri: REDIRECT_URI
        })
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("Discord token exchange failed");
      return res.status(401).send(
        "فشل تسجيل الدخول. ارجع للموقع وحاول مرة ثانية."
      );
    }

    const userResponse = await fetch(
      "https://discord.com/api/users/@me",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`
        }
      }
    );

    const discord = await userResponse.json();

    if (!userResponse.ok || !discord.id || !discord.username) {
      return res.status(401).send(
        "تعذر الحصول على معلومات حساب Discord."
      );
    }

    const users = readJSON(USERS_FILE);
    const now = new Date().toISOString();

    let user = users.find(item => item.discordId === discord.id);

    if (user) {
      user.username = discord.username;
      user.displayName = discord.global_name || discord.username;
      user.lastSeen = now;
      user.visits = (user.visits || 0) + 1;
    } else {
      user = {
        discordId: discord.id,
        username: discord.username,
        displayName: discord.global_name || discord.username,
        firstSeen: now,
        lastSeen: now,
        visits: 1
      };

      users.push(user);
    }

    saveJSON(USERS_FILE, users);

    req.session.discordUser = {
      id: discord.id,
      username: discord.username,
      displayName: discord.global_name || discord.username
    };

    req.session.save(error => {
      if (error) {
        return res.status(500).send(
          "تعذر حفظ جلسة تسجيل الدخول."
        );
      }

      res.redirect("/?discord=connected");
    });
  } catch (error) {
    console.error("Discord login error:", error.message);

    res.status(500).send(
      "حدث خطأ أثناء تسجيل الدخول. حاول لاحقًا."
    );
  }
});

/* =========================
   معلومات المستخدم المسجل
========================= */

app.get("/api/me", requireDiscord, (req, res) => {
  res.json({
    loggedIn: true,
    username: req.session.discordUser.username,
    displayName: req.session.discordUser.displayName
  });
});

/* تسجيل الخروج */

app.post("/auth/logout", (req, res) => {
  req.session.destroy(error => {
    if (error) {
      return res.status(500).json({
        error: "تعذر تسجيل الخروج"
      });
    }

    res.clearCookie("vanta.sid");
    res.json({ success: true });
  });
});

/* =========================
   إنشاء الطلبات
========================= */

app.post("/api/orders", async (req, res) => {
  const service = clean(req.body.service, 100);
  const projectName = clean(req.body.projectName, 100);
  const description = clean(req.body.description, 2000);
  const reference = clean(req.body.reference, 500);
  const speed = clean(req.body.speed, 50) || "حسب الاتفاق";
  const currency = clean(req.body.currency, 10);
  const country = clean(req.body.country, 10);
  const budget = Number(req.body.budget);

  const currencies = [
    "KWD", "SAR", "AED", "QAR", "BHD",
    "OMR", "USD", "GBP", "EGP"
  ];

  const countries = [
    "KW", "SA", "AE", "QA", "BH",
    "OM", "US", "GB", "EG"
  ];

  if (
    !service ||
    !projectName ||
    !description ||
    !Number.isFinite(budget) ||
    budget <= 0 ||
    !currencies.includes(currency) ||
    !countries.includes(country)
  ) {
    return res.status(400).json({
      error: "تأكد من صحة بيانات الطلب"
    });
  }

  const orders = readJSON(ORDERS_FILE);
  let orderId;

  do {
    orderId = "VANTA-" + crypto.randomInt(10000, 100000);
  } while (orders.some(item => item.orderId === orderId));

  const order = {
    orderId,
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

  if (WEBHOOK_URL) {
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: "VANTA",
          embeds: [{
            title: "🟣 طلب جديد — VANTA",
            color: 10181046,
            fields: [
              { name: "رقم الطلب", value: order.orderId },
              { name: "الخدمة", value: service },
              { name: "المشروع", value: projectName },
              {
                name: "الميزانية",
                value: `${budget} ${currency}`
              },
              {
                name: "التفاصيل",
                value: description.slice(0, 1000)
              }
            ],
            timestamp: order.createdAt
          }]
        })
      });

      if (!response.ok) {
        console.error("Discord order webhook failed");
      }
    } catch (error) {
      console.error("Order webhook error:", error.message);
    }
  }

  res.status(201).json({
    success: true,
    orderId,
    status: order.status
  });
});

/* متابعة الطلب */

app.get("/api/orders/:id", (req, res) => {
  const id = clean(req.params.id, 30).toUpperCase();
  const order = readJSON(ORDERS_FILE).find(
    item => item.orderId === id
  );

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

/* تسجيل الزيارات */

app.post("/api/visit", (req, res) => {
  const visits = readJSON(VISITS_FILE);
  const now = new Date();

  visits.push({
    timestamp: now.toISOString(),
    date: now.toISOString().slice(0, 10)
  });

  saveJSON(VISITS_FILE, visits);

  res.json({ success: true });
});

/* إحصائيات الإدارة */

app.get("/api/admin/stats", requireAdmin, (req, res) => {
  const orders = readJSON(ORDERS_FILE);
  const visits = readJSON(VISITS_FILE);
  const today = new Date().toISOString().slice(0, 10);

  res.json({
    totalOrders: orders.length,
    totalVisits: visits.length,
    todayVisits: visits.filter(v => v.date === today).length,
    registeredDiscordUsers: readJSON(USERS_FILE).length
  });
});

/* قائمة الطلبات للإدارة */

app.get("/api/admin/orders", requireAdmin, (req, res) => {
  res.json(readJSON(ORDERS_FILE).slice().reverse());
});

/* تحديث حالة الطلب */

app.patch("/api/admin/orders/:id", requireAdmin, (req, res) => {
  const orders = readJSON(ORDERS_FILE);
  const order = orders.find(
    item => item.orderId === req.params.id
  );

  const allowed = [
    "بانتظار المراجعة",
    "قيد التنفيذ",
    "بانتظار العميل",
    "مكتمل",
    "ملغي"
  ];

  const status = clean(req.body.status, 50);

  if (!order) {
    return res.status(404).json({ error: "الطلب غير موجود" });
  }

  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "الحالة غير صحيحة" });
  }

  order.status = status;
  order.updatedAt = new Date().toISOString();

  saveJSON(ORDERS_FILE, orders);

  res.json({ success: true, order });
});

/* أسماء حسابات Discord المسجلة — للإدارة فقط */

app.get("/api/admin/users", requireAdmin, (req, res) => {
  const users = readJSON(USERS_FILE);

  res.json(users.map(user => ({
    username: user.username,
    displayName: user.displayName,
    firstSeen: user.firstSeen,
    lastSeen: user.lastSeen,
    visits: user.visits
  })));
});

/* تشغيل السيرفر */

app.listen(PORT, () => {
  console.log(`VANTA server running on port ${PORT}`);
});
