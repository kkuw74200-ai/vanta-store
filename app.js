let order = {
  service: "",
  projectName: "",
  description: "",
  reference: "",
  speed: "",
  budget: ""
};

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.remove("active");
  });
  
  const screen = document.getElementById(id);
  
  if (screen) {
    screen.classList.add("active");
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }
}

function selectService(service) {
  
  order.service = service;
  
  document.getElementById("selectedServiceText").textContent =
    "الخدمة المختارة: " + service;
  
  showScreen("details");
}

function goBudget() {
  
  const projectName =
    document.getElementById("projectName").value.trim();
  
  const description =
    document.getElementById("description").value.trim();
  
  const reference =
    document.getElementById("reference").value.trim();
  
  const speed =
    document.getElementById("speed").value;
  
  if (!projectName) {
    alert("اكتب اسم المشروع");
    return;
  }
  
  if (!description) {
    alert("اكتب تفاصيل المشروع");
    return;
  }
  
  order.projectName = projectName;
  order.description = description;
  order.reference = reference || "لا يوجد";
  order.speed = speed;
  
  showScreen("budget");
}

function selectBudget(budget) {
  
  order.budget = budget;
  
  document.querySelectorAll(".budget-grid button").forEach(button => {
    button.style.borderColor = "";
  });
  
  event.currentTarget.style.borderColor = "#6c3bff";
}

function reviewOrder() {
  
  if (!order.budget) {
    alert("حدد الميزانية أول");
    return;
  }
  
  document.getElementById("reviewService").textContent =
    order.service;
  
  document.getElementById("reviewProject").textContent =
    order.projectName;
  
  document.getElementById("reviewDescription").textContent =
    order.description;
  
  document.getElementById("reviewReference").textContent =
    order.reference;
  
  document.getElementById("reviewBudget").textContent =
    order.budget;
  
  document.getElementById("reviewSpeed").textContent =
    order.speed;
  
  showScreen("review");
}

async function submitOrder() {
  
  const button =
    document.querySelector("#review .main-btn");
  
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
      throw new Error(result.error || "حدث خطأ");
    }
    
    document.getElementById("orderId").textContent =
      result.orderId;
    
    showScreen("success");
    
  } catch (error) {
    
    console.error(error);
    
    alert(
      "تعذر إرسال الطلب. تأكد أن السيرفر شغال."
    );
    
  } finally {
    
    button.disabled = false;
    button.textContent = "📨 إرسال الطلب";
  }
}