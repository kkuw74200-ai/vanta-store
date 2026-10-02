/* currency.js */

(() => {
    "use strict";

    const STORAGE_KEY = "vanta_country";

    const COUNTRIES = {
        KW: { name: "الكويت", flag: "🇰🇼", currency: "KWD", locale: "ar-KW" },
        SA: { name: "السعودية", flag: "🇸🇦", currency: "SAR", locale: "ar-SA" },
        AE: { name: "الإمارات", flag: "🇦🇪", currency: "AED", locale: "ar-AE" },
        QA: { name: "قطر", flag: "🇶🇦", currency: "QAR", locale: "ar-QA" },
        BH: { name: "البحرين", flag: "🇧🇭", currency: "BHD", locale: "ar-BH" },
        OM: { name: "عُمان", flag: "🇴🇲", currency: "OMR", locale: "ar-OM" },
        JO: { name: "الأردن", flag: "🇯🇴", currency: "JOD", locale: "ar-JO" },
        EG: { name: "مصر", flag: "🇪🇬", currency: "EGP", locale: "ar-EG" },
        IQ: { name: "العراق", flag: "🇮🇶", currency: "IQD", locale: "ar-IQ" },
        MA: { name: "المغرب", flag: "🇲🇦", currency: "MAD", locale: "ar-MA" },
        DZ: { name: "الجزائر", flag: "🇩🇿", currency: "DZD", locale: "ar-DZ" },
        TN: { name: "تونس", flag: "🇹🇳", currency: "TND", locale: "ar-TN" },
        LY: { name: "ليبيا", flag: "🇱🇾", currency: "LYD", locale: "ar-LY" },
        SD: { name: "السودان", flag: "🇸🇩", currency: "SDG", locale: "ar-SD" },
        YE: { name: "اليمن", flag: "🇾🇪", currency: "YER", locale: "ar-YE" },
        LB: { name: "لبنان", flag: "🇱🇧", currency: "LBP", locale: "ar-LB" },
        PS: { name: "فلسطين", flag: "🇵🇸", currency: "ILS", locale: "ar-PS" },
        SY: { name: "سوريا", flag: "🇸🇾", currency: "SYP", locale: "ar-SY" },

        US: { name: "أمريكا", flag: "🇺🇸", currency: "USD", locale: "en-US" },
        CA: { name: "كندا", flag: "🇨🇦", currency: "CAD", locale: "en-CA" },
        GB: { name: "بريطانيا", flag: "🇬🇧", currency: "GBP", locale: "en-GB" },
        AU: { name: "أستراليا", flag: "🇦🇺", currency: "AUD", locale: "en-AU" },
        NZ: { name: "نيوزيلندا", flag: "🇳🇿", currency: "NZD", locale: "en-NZ" },
        JP: { name: "اليابان", flag: "🇯🇵", currency: "JPY", locale: "ja-JP" },
        CN: { name: "الصين", flag: "🇨🇳", currency: "CNY", locale: "zh-CN" },
        KR: { name: "كوريا الجنوبية", flag: "🇰🇷", currency: "KRW", locale: "ko-KR" },
        IN: { name: "الهند", flag: "🇮🇳", currency: "INR", locale: "en-IN" },
        PK: { name: "باكستان", flag: "🇵🇰", currency: "PKR", locale: "en-PK" },
        TR: { name: "تركيا", flag: "🇹🇷", currency: "TRY", locale: "tr-TR" },
        RU: { name: "روسيا", flag: "🇷🇺", currency: "RUB", locale: "ru-RU" },

        DE: { name: "ألمانيا", flag: "🇩🇪", currency: "EUR", locale: "de-DE" },
        FR: { name: "فرنسا", flag: "🇫🇷", currency: "EUR", locale: "fr-FR" },
        IT: { name: "إيطاليا", flag: "🇮🇹", currency: "EUR", locale: "it-IT" },
        ES: { name: "إسبانيا", flag: "🇪🇸", currency: "EUR", locale: "es-ES" },
        PT: { name: "البرتغال", flag: "🇵🇹", currency: "EUR", locale: "pt-PT" },
        NL: { name: "هولندا", flag: "🇳🇱", currency: "EUR", locale: "nl-NL" },
        BE: { name: "بلجيكا", flag: "🇧🇪", currency: "EUR", locale: "nl-BE" },
        AT: { name: "النمسا", flag: "🇦🇹", currency: "EUR", locale: "de-AT" },
        GR: { name: "اليونان", flag: "🇬🇷", currency: "EUR", locale: "el-GR" },
        IE: { name: "أيرلندا", flag: "🇮🇪", currency: "EUR", locale: "en-IE" },
        FI: { name: "فنلندا", flag: "🇫🇮", currency: "EUR", locale: "fi-FI" },
        SE: { name: "السويد", flag: "🇸🇪", currency: "SEK", locale: "sv-SE" },
        NO: { name: "النرويج", flag: "🇳🇴", currency: "NOK", locale: "nb-NO" },
        DK: { name: "الدنمارك", flag: "🇩🇰", currency: "DKK", locale: "da-DK" },
        CH: { name: "سويسرا", flag: "🇨🇭", currency: "CHF", locale: "de-CH" },
        PL: { name: "بولندا", flag: "🇵🇱", currency: "PLN", locale: "pl-PL" },
        CZ: { name: "التشيك", flag: "🇨🇿", currency: "CZK", locale: "cs-CZ" },
        RO: { name: "رومانيا", flag: "🇷🇴", currency: "RON", locale: "ro-RO" },
        HU: { name: "المجر", flag: "🇭🇺", currency: "HUF", locale: "hu-HU" },
        UA: { name: "أوكرانيا", flag: "🇺🇦", currency: "UAH", locale: "uk-UA" },

        BR: { name: "البرازيل", flag: "🇧🇷", currency: "BRL", locale: "pt-BR" },
        MX: { name: "المكسيك", flag: "🇲🇽", currency: "MXN", locale: "es-MX" },
        AR: { name: "الأرجنتين", flag: "🇦🇷", currency: "ARS", locale: "es-AR" },
        CL: { name: "تشيلي", flag: "🇨🇱", currency: "CLP", locale: "es-CL" },
        CO: { name: "كولومبيا", flag: "🇨🇴", currency: "COP", locale: "es-CO" },

        ZA: { name: "جنوب أفريقيا", flag: "🇿🇦", currency: "ZAR", locale: "en-ZA" },
        NG: { name: "نيجيريا", flag: "🇳🇬", currency: "NGN", locale: "en-NG" },
        KE: { name: "كينيا", flag: "🇰🇪", currency: "KES", locale: "en-KE" },

        ID: { name: "إندونيسيا", flag: "🇮🇩", currency: "IDR", locale: "id-ID" },
        MY: { name: "ماليزيا", flag: "🇲🇾", currency: "MYR", locale: "ms-MY" },
        SG: { name: "سنغافورة", flag: "🇸🇬", currency: "SGD", locale: "en-SG" },
        TH: { name: "تايلاند", flag: "🇹🇭", currency: "THB", locale: "th-TH" },
        VN: { name: "فيتنام", flag: "🇻🇳", currency: "VND", locale: "vi-VN" },
        PH: { name: "الفلبين", flag: "🇵🇭", currency: "PHP", locale: "en-PH" }
    };

    let currentCountry =
        localStorage.getItem(STORAGE_KEY) &&
        COUNTRIES[localStorage.getItem(STORAGE_KEY)]
            ? localStorage.getItem(STORAGE_KEY)
            : null;

    function getCountry() {
        return COUNTRIES[currentCountry] || COUNTRIES.KW;
    }

    function formatCurrency(amount) {
        const country = getCountry();
        const number = Number(
            String(amount)
                .replace(/[^\d.-]/g, "")
        );

        if (!Number.isFinite(number)) return amount;

        return new Intl.NumberFormat(country.locale, {
            style: "currency",
            currency: country.currency,
            currencyDisplay: "symbol",
            maximumFractionDigits: 2
        }).format(number);
    }

    function updateCurrency() {
        const country = getCountry();

        document.querySelectorAll("[data-price]").forEach(element => {
            const value = element.getAttribute("data-price");
            if (value !== null) {
                element.textContent = formatCurrency(value);
            }
        });

        const budget = document.getElementById("reviewBudget");

        if (
            budget &&
            window.order &&
            order.budget !== undefined &&
            order.budget !== ""
        ) {
            const formatted = formatCurrency(order.budget);

            if (budget.textContent !== formatted) {
                budget.textContent = formatted;
            }
        }

        document.querySelectorAll("[data-currency]").forEach(element => {
            element.textContent = country.currency;
        });

        const selectedCountry = document.getElementById("vantaSelectedCountry");

        if (selectedCountry) {
            selectedCountry.textContent =
                `${country.flag} ${country.name}`;
        }
    }

    function saveCountry(code) {
        if (!COUNTRIES[code]) return;

        currentCountry = code;
        localStorage.setItem(STORAGE_KEY, code);

        updateCurrency();

        const modal = document.getElementById("vantaCurrencyModal");

        if (modal) {
            modal.remove();
        }
    }

    function createCountryModal() {
        if (document.getElementById("vantaCurrencyModal")) return;

        const modal = document.createElement("div");
        modal.id = "vantaCurrencyModal";

        modal.innerHTML = `
            <div class="vanta-currency-box">
                <div class="vanta-currency-logo">VANTA</div>

                <div class="vanta-currency-title">
                    اختر دولتك
                </div>

                <div class="vanta-currency-subtitle">
                    اختر الدولة عشان نعرض لك الأسعار بعملتك
                </div>

                <select id="vantaCountrySelect">
                    <option value="">اختر دولتك</option>
                    ${Object.entries(COUNTRIES)
                        .map(([code, country]) =>
                            `<option value="${code}">
                                ${country.flag} ${country.name} — ${country.currency}
                            </option>`
                        )
                        .join("")}
                </select>

                <button id="vantaCountryButton">
                    متابعة
                </button>
            </div>
        `;

        document.body.appendChild(modal);

        document
            .getElementById("vantaCountryButton")
            .addEventListener("click", () => {
                const value =
                    document.getElementById("vantaCountrySelect").value;

                if (!value) {
                    document.getElementById("vantaCountrySelect").style.borderColor =
                        "#ff3b6b";
                    return;
                }

                saveCountry(value);
            });
    }

    function createCountryButton() {
        if (document.getElementById("vantaCountryButtonSmall")) return;

        const button = document.createElement("button");

        button.id = "vantaCountryButtonSmall";
        button.innerHTML = `
            <span id="vantaSelectedCountry">
                ${getCountry().flag} ${getCountry().name}
            </span>
            <span>⌄</span>
        `;

        document.body.appendChild(button);

        button.addEventListener("click", () => {
            createCountryModal();

            const modal = document.getElementById("vantaCurrencyModal");

            if (modal) {
                const select =
                    document.getElementById("vantaCountrySelect");

                if (select) {
                    select.value = currentCountry || "KW";
                }
            }
        });
    }

    function injectStyles() {
        if (document.getElementById("vantaCurrencyStyles")) return;

        const style = document.createElement("style");

        style.id = "vantaCurrencyStyles";

        style.textContent = `
            #vantaCurrencyModal {
                position: fixed;
                inset: 0;
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                background: rgba(0,0,0,.88);
                backdrop-filter: blur(12px);
                direction: rtl;
            }

            .vanta-currency-box {
                width: min(430px, 100%);
                padding: 30px;
                border-radius: 24px;
                background:
                    linear-gradient(145deg, #15121c, #09080d);
                border: 1px solid rgba(150,80,255,.45);
                box-shadow:
                    0 0 50px rgba(110,40,255,.22),
                    inset 0 0 30px rgba(120,50,255,.04);
                text-align: center;
                color: white;
            }

            .vanta-currency-logo {
                font-size: 32px;
                font-weight: 900;
                letter-spacing: 5px;
                color: #a970ff;
                margin-bottom: 15px;
            }

            .vanta-currency-title {
                font-size: 25px;
                font-weight: 900;
                margin-bottom: 8px;
            }

            .vanta-currency-subtitle {
                color: #aaa;
                font-size: 14px;
                margin-bottom: 22px;
            }

            #vantaCountrySelect {
                width: 100%;
                height: 52px;
                padding: 0 15px;
                border-radius: 14px;
                border: 1px solid #39313f;
                background: #0d0b11;
                color: white;
                outline: none;
                font-size: 15px;
                margin-bottom: 14px;
            }

            #vantaCountrySelect:focus {
                border-color: #9b5cff;
                box-shadow: 0 0 15px rgba(155,92,255,.18);
            }

            #vantaCountryButton {
                width: 100%;
                height: 52px;
                border: 0;
                border-radius: 14px;
                cursor: pointer;
                background: linear-gradient(135deg,#9b5cff,#6d28d9);
                color: white;
                font-size: 16px;
                font-weight: 900;
                box-shadow: 0 8px 25px rgba(109,40,217,.3);
            }

            #vantaCountryButton:hover {
                filter: brightness(1.1);
            }

            #vantaCountryButtonSmall {
                position: fixed;
                left: 18px;
                bottom: 18px;
                z-index: 99998;
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 11px 15px;
                border-radius: 14px;
                border: 1px solid rgba(155,92,255,.35);
                background: rgba(13,11,17,.94);
                backdrop-filter: blur(10px);
                color: white;
                cursor: pointer;
                font-weight: 800;
                box-shadow: 0 8px 25px rgba(0,0,0,.35);
            }

            #vantaCountryButtonSmall:hover {
                border-color: #9b5cff;
            }
        `;

        document.head.appendChild(style);
    }

    function hookReviewOrder() {
        if (typeof window.reviewOrder !== "function") return;

        if (window.reviewOrder.__vantaCurrencyHooked) return;

        const originalReviewOrder = window.reviewOrder;

        function newReviewOrder() {
            const result = originalReviewOrder.apply(this, arguments);

            setTimeout(() => {
                updateCurrency();
            }, 0);

            return result;
        }

        newReviewOrder.__vantaCurrencyHooked = true;

        window.reviewOrder = newReviewOrder;
    }

    function init() {
        injectStyles();

        if (!currentCountry) {
            createCountryModal();
        } else {
            createCountryButton();
        }

        updateCurrency();
        hookReviewOrder();

        const observer = new MutationObserver(() => {
            updateCurrency();
            hookReviewOrder();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });

        setInterval(() => {
            hookReviewOrder();
            updateCurrency();
        }, 500);
    }

    window.VANTA_CURRENCY = {
        countries: COUNTRIES,
        getCountry,
        formatCurrency,
        setCountry: saveCountry,
        update: updateCurrency
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
