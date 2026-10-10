"use strict";

const COUNTRIES = {
  KW: { name: "الكويت", currency: "KWD", flag: "🇰🇼" },
  SA: { name: "السعودية", currency: "SAR", flag: "🇸🇦" },
  AE: { name: "الإمارات", currency: "AED", flag: "🇦🇪" },
  QA: { name: "قطر", currency: "QAR", flag: "🇶🇦" },
  BH: { name: "البحرين", currency: "BHD", flag: "🇧🇭" },
  OM: { name: "عُمان", currency: "OMR", flag: "🇴🇲" },
  US: { name: "أمريكا", currency: "USD", flag: "🇺🇸" },
  GB: { name: "بريطانيا", currency: "GBP", flag: "🇬🇧" },
  EG: { name: "مصر", currency: "EGP", flag: "🇪🇬" }
};

const order = {
  service: "",
  projectName: "",
  description: "",
  reference: "",
  speed: "حسب الاتفاق",
  budget: 0,
  currency: "KWD",
  country: "KW"
};

let lastOrderId = "";

function $(id) {
  return document.getElementById(id);
}

/* التنقل بين الصفحات */

function showScreen(id) {
  const target = $(id);

  if (!target || !target.classList.contains("screen")) return;

  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.remove("active");
  });

  target.classList.add("active");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

/* اختيار الدولة والعملة */

function openCountryModal() {
  $("countryModal").classList.add("visible");
}

function confirmCountry() {
  const code = $("countrySelect").value;

  if (!COUNTRIES[code]) return;

  order.country = code;
  order.currency = COUNTRIES[code].currency;

  try {
    localStorage.setItem("vanta_country", code);
  } catch (error) {
    console.warn("تعذر حفظ الدولة على الجهاز");
  }

  updateCurrency();
  $("countryModal").classList.remove("visible");
}

function updateCurrency() {
  const country = COUNTRIES[order.country] || COUNTRIES.KW;

  $("currencyButton").textContent =
    `${country.flag} ${country.currency}`;

  $("currencyLabel").textContent = country.currency;
}

function formatCurrency(amount) {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: order.currency,
      maximumFractionDigits: 3
    }).format(Number(amount));
  } catch {
    return `${amount} ${order.currency}`;
  }
}

/* اختيار الخدمة */

function chooseService(service) {
  order.service = service;

  $("selectedServiceText").textContent =
    "الخدمة المختارة: " + service;

  $("budgetServiceText").textContent =
    "الخدمة المختارة: " + service;

  showScreen("details");
}

/* تفاصيل المشروع */

function goToBudget() {
  const projectName = $("projectName").value.trim();
  const description = $("description").value.trim();
  const reference = $("reference").value.trim();
  const speed = $("speed").value;

  if (!order.service) {
    alert("اختر الخدمة أولًا");
    showScreen("services");
    return;
  }

  if (!projectName) {
    alert("اكتب اسم المشروع");
    $("projectName").focus();
    return;
  }

  if (!description) {
    alert("اكتب تفاصيل المشروع");
    $("description").focus();
    return;
  }

  if (reference) {
    try {
      const url = new URL(reference);

      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("رابط غير صالح");
      }
    } catch {
      alert("تأكد من صحة الرابط المرجعي");
      $("reference").focus();
      return;
    }
  }

  order.projectName = projectName;
  order.description = description;
  order.reference = reference || "لا يوجد";
  order.speed = speed;

  $("budgetServiceText").textContent =
    "الخدمة المختارة: " + order.service;

  showScreen("budget");
}

/* مراجعة الطلب */

function reviewOrder() {
  const budget = Number($("budgetInput").value);

  if (!Number.isFinite(budget) || budget <= 0) {
    alert("أدخل ميزانية صحيحة");
    $("budgetInput").focus();
    return;
  }

  order.budget = budget;

  $("reviewService").textContent = order.service;
  $("reviewProject").textContent = order.projectName;
  $("reviewDescription").textContent = order.description;
  $("reviewReference").textContent = order.reference;
  $("reviewSpeed").textContent = order.speed;
  $("reviewBudget").textContent = formatCurrency(order.budget);

  showScreen("review");
}

/* إرسال الطلب */

async function submitOrder() {
  const button = $("submitButton");

  if (button.disabled) return;

  button.disabled = true;
  button.textContent = "جاري إرسال الطلب...";

  try {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(order)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "تعذر إرسال الطلب");
    }

    if (!result.orderId) {
      throw new Error("لم يستلم الموقع رقم الطلب");
    }

    lastOrderId = result.orderId;

    $("orderId").textContent = lastOrderId;
    $("trackingId").value = lastOrderId;

    showScreen("success");
  } catch (error) {
    console.error(error);

    alert(
      error.message ||
      "تعذر إرسال الطلب. تأكد من تشغيل السيرفر."
    );
  } finally {
    button.disabled = false;
    button.textContent = "إرسال الطلب ↗";
  }
}

/* نسخ رقم الطلب */

async function copyOrderId() {
  const id = $("orderId").textContent.trim();

  if (!id) return;

  try {
    await navigator.clipboard.writeText(id);
    alert("تم نسخ رقم الطلب");
  } catch {
    const field = document.createElement("textarea");

    field.value = id;
    document.body.appendChild(field);
    field.select();

    const copied = document.execCommand("copy");
    field.remove();

    alert(copied ? "تم نسخ رقم الطلب" : "انسخ الرقم يدويًا: " + id);
  }
}

/* متابعة الطلب */

async function trackOrder() {
  const input = $("trackingId");
  const resultBox = $("trackingResult");
  const id = input.value.trim().toUpperCase();

  if (!id) {
    alert("اكتب رقم الطلب");
    input.focus();
    return;
  }

  resultBox.classList.add("visible");
  resultBox.textContent = "جاري البحث عن الطلب...";

  try {
    const response = await fetch(
      "/api/orders/" + encodeURIComponent(id)
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "لم يتم العثور على الطلب");
    }

    resultBox.replaceChildren();

    const heading = document.createElement("h3");
    heading.textContent = "تفاصيل الطلب";

    const orderNumber = document.createElement("p");
    orderNumber.textContent = "رقم الطلب: " + result.orderId;

    const service = document.createElement("p");
    service.textContent = "الخدمة: " + result.service;

    const project = document.createElement("p");
    project.textContent = "المشروع: " + result.projectName;

    const status = document.createElement("p");
    status.className = "track-status";
    status.textContent = "الحالة: " + result.status;

    const created = document.createElement("p");
    created.textContent =
      "تاريخ الطلب: " + formatDate(result.createdAt);

    resultBox.append(
      heading,
      orderNumber,
      service,
      project,
      status,
      created
    );
  } catch (error) {
    resultBox.replaceChildren();

    const message = document.createElement("p");
    message.textContent = error.message || "حدث خطأ أثناء البحث";

    resultBox.appendChild(message);
  }
}

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "غير متوفر";

  return date.toLocaleString("ar");
}

function prefillTracking() {
  if (lastOrderId) {
    $("trackingId").value = lastOrderId;
  }
}

/* طلب جديد */

function resetOrder() {
  order.service = "";
  order.projectName = "";
  order.description = "";
  order.reference = "";
  order.speed = "حسب الاتفاق";
  order.budget = 0;

  $("projectName").value = "";
  $("description").value = "";
  $("reference").value = "";
  $("speed").value = "حسب الاتفاق";
  $("budgetInput").value = "";
  $("trackingResult").replaceChildren();
  $("trackingResult").classList.remove("visible");

  showScreen("services");
}

/* تسجيل الزيارة */

async function recordVisit() {
  try {
    await fetch("/api/visit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
    });
  } catch (error) {
    console.warn("تعذر تسجيل الزيارة");
  }
}

/* تشغيل الموقع */

document.addEventListener("DOMContentLoaded", () => {
  let savedCountry = "";

  try {
    savedCountry = localStorage.getItem("vanta_country") || "";
  } catch (error) {
    console.warn("تعذر قراءة الدولة المحفوظة");
  }

  if (COUNTRIES[savedCountry]) {
    order.country = savedCountry;
    order.currency = COUNTRIES[savedCountry].currency;

    $("countrySelect").value = savedCountry;
    updateCurrency();
  } else {
    $("countrySelect").value = "KW";
    openCountryModal();
  }

  recordVisit();

  $("countryModal").addEventListener("click", event => {
    if (event.target === $("countryModal")) {
      // لا نغلق نافذة اختيار الدولة بالنقر خارجها
    }
  });

  $("trackingId").addEventListener("keydown", event => {
    if (event.key === "Enter") trackOrder();
  });

  $("budgetInput").addEventListener("keydown", event => {
    if (event.key === "Enter") reviewOrder();
  });
});
