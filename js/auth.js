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
// CHECK LOGIN
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
                    .getElementById("login-username")
                    .value
                    .trim();

            const password =
                document
                    .getElementById("login-password")
                    .value;

            const errorEl =
                document.getElementById(
                    "login-error"
                );

            errorEl.textContent = "";

            try {

                const response =
                    await fetch(
                        `${API_URL}/api/auth/login`,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    username,
                                    password
                                })
                        }
                    );

                const text =
                    await response.text();

                let result = {};

                try {
                    result =
                        text
                            ? JSON.parse(text)
                            : {};
                } catch {
                    result = {
                        error: text
                    };
                }

                if (!response.ok) {

                    errorEl.textContent =
                        result.error ||
                        `Server error: ${response.status}`;

                    return;
                }

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
                    "Cannot connect to Ember server.";
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
                    .getElementById("signup-display")
                    .value
                    .trim();

            const username =
                document
                    .getElementById("signup-username")
                    .value
                    .trim();

            const password =
                document
                    .getElementById("signup-password")
                    .value;

            const errorEl =
                document.getElementById(
                    "signup-error"
                );

            errorEl.textContent = "";

            try {

                const response =
                    await fetch(
                        `${API_URL}/api/auth/signup`,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    displayName,
                                    username,
                                    password
                                })
                        }
                    );

                const text =
                    await response.text();

                let result = {};

                try {
                    result =
                        text
                            ? JSON.parse(text)
                            : {};
                } catch {
                    result = {
                        error: text
                    };
                }

                if (!response.ok) {

                    errorEl.textContent =
                        result.error ||
                        `Server error: ${response.status}`;

                    return;
                }

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
                    "Cannot connect to Ember server.";
            }
        }
    );
}