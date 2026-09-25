// ========================================
// EMBER AUTH
// ========================================

const API_URL = window.location.origin;


// ========================================
// ELEMENTS
// ========================================

const tabBtns =
    document.querySelectorAll(".tab-btn");

const forms =
    document.querySelectorAll(".auth-form");


// ========================================
// AUTH CHECK
// ========================================

const savedToken =
    localStorage.getItem("ember_token");

const savedUser =
    localStorage.getItem("ember_user");

if (savedToken && savedUser) {
    window.location.replace("app.html");
}


// ========================================
// TABS
// ========================================

tabBtns.forEach((btn) => {

    btn.addEventListener("click", () => {

        tabBtns.forEach((b) => {
            b.classList.remove("active");
        });

        forms.forEach((form) => {
            form.classList.remove("active");
        });

        btn.classList.add("active");

        const form =
            document.getElementById(
                `${btn.dataset.tab}-form`
            );

        if (form) {
            form.classList.add("active");
        }
    });

});


// ========================================
// API REQUEST
// ========================================

async function sendRequest(
    endpoint,
    data
) {

    const response =
        await fetch(
            `${API_URL}${endpoint}`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(data)
            }
        );


    const rawText =
        await response.text();


    let result = {};

    try {
        result =
            rawText
                ? JSON.parse(rawText)
                : {};
    } catch {
        result = {
            error: rawText
        };
    }


    if (!response.ok) {

        throw new Error(
            result.error ||
            `Server returned ${response.status}`
        );
    }


    return result;
}


// ========================================
// LOGIN
// ========================================

const loginForm =
    document.getElementById("login-form");

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            const username =
                document
                    .getElementById(
                        "login-username"
                    )
                    .value
                    .trim();

            const password =
                document
                    .getElementById(
                        "login-password"
                    )
                    .value;

            const errorEl =
                document.getElementById(
                    "login-error"
                );

            errorEl.textContent = "";

            try {

                console.log(
                    "Ember API:",
                    API_URL
                );

                const result =
                    await sendRequest(
                        "/api/auth/login",
                        {
                            username,
                            password
                        }
                    );


                localStorage.setItem(
                    "ember_token",
                    result.token
                );


                localStorage.setItem(
                    "ember_user",
                    JSON.stringify(
                        result.user
                    )
                );


                window.location.replace(
                    "app.html"
                );

            } catch (error) {

                console.error(
                    "LOGIN ERROR:",
                    error
                );

                errorEl.textContent =
                    error.message ||
                    "Login failed.";
            }
        }
    );
}


// ========================================
// SIGN UP
// ========================================

const signupForm =
    document.getElementById("signup-form");

if (signupForm) {

    signupForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            const displayName =
                document
                    .getElementById(
                        "signup-display"
                    )
                    .value
                    .trim();

            const username =
                document
                    .getElementById(
                        "signup-username"
                    )
                    .value
                    .trim();

            const password =
                document
                    .getElementById(
                        "signup-password"
                    )
                    .value;

            const errorEl =
                document.getElementById(
                    "signup-error"
                );

            errorEl.textContent = "";

            try {

                console.log(
                    "Ember API:",
                    API_URL
                );

                const result =
                    await sendRequest(
                        "/api/auth/signup",
                        {
                            displayName,
                            username,
                            password
                        }
                    );


                localStorage.setItem(
                    "ember_token",
                    result.token
                );


                localStorage.setItem(
                    "ember_user",
                    JSON.stringify(
                        result.user
                    )
                );


                window.location.replace(
                    "app.html"
                );

            } catch (error) {

                console.error(
                    "SIGNUP ERROR:",
                    error
                );

                errorEl.textContent =
                    error.message ||
                    "Account creation failed.";
            }
        }
    );
}