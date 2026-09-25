// ========================================
// EMBER CHAT APP
// ========================================

const API_URL = "https://ember-app3.onrender.com";


// ========================================
// AUTH
// ========================================

const token =
    localStorage.getItem("ember_token");

const currentUserRaw =
    localStorage.getItem("ember_user");

if (!token || !currentUserRaw) {
    window.location.replace("index.html");
    throw new Error("Not authenticated.");
}

const currentUser =
    JSON.parse(currentUserRaw);


// ========================================
// ELEMENTS
// ========================================

const meAvatar =
    document.getElementById("me-avatar");

const meName =
    document.getElementById("me-name");

const meHandle =
    document.getElementById("me-handle");

const logoutBtn =
    document.getElementById("logout-btn");

const contactSearch =
    document.getElementById("contact-search");

const addContactBtn =
    document.getElementById("add-contact-btn");

const railHint =
    document.getElementById("rail-hint");

const contactList =
    document.getElementById("contact-list");

const emptyState =
    document.getElementById("empty-state");

const convActive =
    document.getElementById("conv-active");

const convAvatar =
    document.getElementById("conv-avatar");

const convName =
    document.getElementById("conv-name");

const convStatus =
    document.getElementById("conv-status");

const messagesEl =
    document.getElementById("messages");

const composer =
    document.getElementById("composer");

const composerInput =
    document.getElementById("composer-input");

const disappearToggle =
    document.getElementById("disappear-toggle");

const disappearDuration =
    document.getElementById("disappear-duration");


// ========================================
// STATE
// ========================================

let contacts = [];
let activeContact = null;
let socket = null;
let refreshTimer = null;
let messageRefreshInProgress = false;
let searchTimer = null;


// ========================================
// API
// ========================================

async function apiFetch(
    path,
    options = {}
) {

    const headers = {
        ...(options.headers || {}),
        "Authorization":
            `Bearer ${token}`,
        "Content-Type":
            "application/json"
    };


    const response =
        await fetch(
            `${API_URL}${path}`,
            {
                ...options,
                headers
            }
        );


    if (response.status === 401) {

        localStorage.removeItem(
            "ember_token"
        );

        localStorage.removeItem(
            "ember_user"
        );

        window.location.replace(
            "index.html"
        );

        throw new Error(
            "Authentication expired."
        );
    }


    const raw =
        await response.text();


    let data = {};

    try {

        data =
            raw
                ? JSON.parse(raw)
                : {};

    } catch {

        data = {
            error: raw
        };
    }


    if (!response.ok) {

        throw new Error(
            data.error ||
            `Server error: ${response.status}`
        );
    }


    return data;
}


// ========================================
// USER UI
// ========================================

function setupCurrentUser() {

    if (meName) {

        meName.textContent =
            currentUser.displayName ||
            currentUser.username;
    }


    if (meHandle) {

        meHandle.textContent =
            `@${currentUser.username}`;
    }


    if (meAvatar) {

        meAvatar.textContent =
            getInitial(
                currentUser.displayName ||
                currentUser.username
            );
    }
}


// ========================================
// INITIALS
// ========================================

function getInitial(name) {

    if (!name) {
        return "?";
    }

    return name
        .trim()
        .charAt(0)
        .toUpperCase();
}


// ========================================
// START
// ========================================

setupCurrentUser();

connectSocket();

loadContacts();


// ========================================
// SOCKET.IO
// ========================================

function connectSocket() {

    if (
        typeof io === "undefined"
    ) {

        console.warn(
            "Socket.IO library not found."
        );

        return;
    }


    socket =
        io({
            auth: {
                token
            }
        });


    socket.on(
        "connect",
        () => {

            console.log(
                "Ember connected."
            );
        }
    );


    socket.on(
        "connect_error",
        (error) => {

            console.error(
                "Socket error:",
                error.message
            );
        }
    );


    socket.on(
        "new_message",
        async (message) => {

            if (
                activeContact &&
                (
                    Number(
                        message.sender_id
                    ) ===
                    Number(
                        activeContact.id
                    )
                    ||
                    Number(
                        message.receiver_id
                    ) ===
                    Number(
                        activeContact.id
                    )
                )
            ) {

                await loadMessages(
                    activeContact.username
                );
            }


            await loadContacts();
        }
    );


    socket.on(
        "message_delivered",
        async () => {

            if (activeContact) {

                await loadMessages(
                    activeContact.username
                );
            }
        }
    );


    socket.on(
        "message_read",
        async () => {

            if (activeContact) {

                await loadMessages(
                    activeContact.username
                );
            }
        }
    );


    socket.on(
        "message_deleted",
        async (data) => {

            removeMessageFromUI(
                data.messageId
            );


            if (activeContact) {

                await loadMessages(
                    activeContact.username
                );
            }
        }
    );


    socket.on(
        "presence_changed",
        (data) => {

            if (
                activeContact &&
                Number(data.userId) ===
                Number(activeContact.id)
            ) {

                updateContactStatus(
                    data.online
                );
            }
        }
    );
}


// ========================================
// LOAD CONTACTS
// ========================================

async function loadContacts() {

    try {

        contacts =
            await apiFetch(
                "/api/contacts"
            );


        renderContacts();

    } catch (error) {

        console.error(
            "Load contacts error:",
            error
        );

        showRailHint(
            error.message
        );
    }
}


// ========================================
// RENDER CONTACTS
// ========================================

function renderContacts(
    list = contacts
) {

    if (!contactList) {
        return;
    }


    contactList.innerHTML = "";


    if (
        !list ||
        list.length === 0
    ) {

        const empty =
            document.createElement("p");

        empty.className =
            "rail-hint";

        empty.textContent =
            "No conversations yet.";

        contactList.appendChild(
            empty
        );

        return;
    }


    list.forEach(
        (contact) => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";

            button.className =
                "contact-item";


            if (
                activeContact &&
                Number(activeContact.id) ===
                Number(contact.id)
            ) {

                button.classList.add(
                    "active"
                );
            }


            const avatar =
                document.createElement(
                    "span"
                );

            avatar.className =
                "avatar";

            avatar.textContent =
                getInitial(
                    contact.displayName ||
                    contact.username
                );


            const info =
                document.createElement(
                    "span"
                );

            info.className =
                "contact-info";


            const name =
                document.createElement(
                    "span"
                );

            name.className =
                "contact-name";

            name.textContent =
                contact.displayName ||
                contact.username;


            const handle =
                document.createElement(
                    "span"
                );

            handle.className =
                "contact-handle";

            handle.textContent =
                `@${contact.username}`;


            info.appendChild(
                name
            );

            info.appendChild(
                handle
            );


            button.appendChild(
                avatar
            );

            button.appendChild(
                info
            );


            button.addEventListener(
                "click",
                () => {

                    openConversation(
                        contact
                    );
                }
            );


            contactList.appendChild(
                button
            );
        }
    );
}


// ========================================
// LIVE USER SEARCH
// ========================================

if (contactSearch) {

    contactSearch.addEventListener(
        "input",
        () => {

            const query =
                contactSearch.value
                    .trim()
                    .toLowerCase();


            clearTimeout(
                searchTimer
            );


            if (!query) {

                renderContacts();

                showRailHint("");

                return;
            }


            searchTimer =
                setTimeout(
                    () => {
                        searchUsers(
                            query
                        );
                    },
                    300
                );
        }
    );


    contactSearch.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Enter"
            ) {

                event.preventDefault();

                addContact();
            }
        }
    );
}


// ========================================
// SEARCH USERS
// ========================================

async function searchUsers(
    query
) {

    try {

        const users =
            await apiFetch(
                `/api/users/search?q=${encodeURIComponent(query)}`
            );


        if (
            !users ||
            users.length === 0
        ) {

            renderContacts([]);

            showRailHint(
                "No user found."
            );

            return;
        }


        showRailHint(
            "Click a user to add them."
        );


        renderSearchResults(
            users
        );

    } catch (error) {

        console.error(
            "User search error:",
            error
        );

        showRailHint(
            error.message
        );
    }
}


// ========================================
// RENDER SEARCH RESULTS
// ========================================

function renderSearchResults(
    users
) {

    if (!contactList) {
        return;
    }


    contactList.innerHTML = "";


    users.forEach(
        (user) => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";

            button.className =
                "contact-item";


            const avatar =
                document.createElement(
                    "span"
                );

            avatar.className =
                "avatar";

            avatar.textContent =
                getInitial(
                    user.displayName ||
                    user.username
                );


            const info =
                document.createElement(
                    "span"
                );

            info.className =
                "contact-info";


            const name =
                document.createElement(
                    "span"
                );

            name.className =
                "contact-name";

            name.textContent =
                user.displayName ||
                user.username;


            const handle =
                document.createElement(
                    "span"
                );

            handle.className =
                "contact-handle";

            handle.textContent =
                `@${user.username}`;


            info.appendChild(
                name
            );

            info.appendChild(
                handle
            );


            button.appendChild(
                avatar
            );

            button.appendChild(
                info
            );


            button.addEventListener(
                "click",
                async () => {

                    await addContactByUser(
                        user
                    );
                }
            );


            contactList.appendChild(
                button
            );
        }
    );
}


// ========================================
// ADD CONTACT BUTTON
// ========================================

if (addContactBtn) {

    addContactBtn.addEventListener(
        "click",
        addContact
    );
}


// ========================================
// ADD CONTACT
// ========================================

async function addContact() {

    const username =
        contactSearch?.value
            .trim()
            .toLowerCase();


    if (!username) {

        showRailHint(
            "Enter a username."
        );

        return;
    }


    try {

        const result =
            await apiFetch(
                "/api/contacts",
                {
                    method: "POST",

                    body:
                        JSON.stringify({
                            username
                        })
                }
            );


        if (contactSearch) {
            contactSearch.value = "";
        }


        showRailHint(
            "Contact added."
        );


        await loadContacts();


        const addedUser =
            result.user;


        const contact =
            contacts.find(
                (item) =>
                    Number(item.id) ===
                    Number(addedUser.id)
            );


        if (contact) {

            openConversation(
                contact
            );
        }

    } catch (error) {

        console.error(
            "Add contact error:",
            error
        );

        showRailHint(
            error.message
        );
    }
}


// ========================================
// ADD SEARCH RESULT
// ========================================

async function addContactByUser(
    user
) {

    try {

        await apiFetch(
            "/api/contacts",
            {
                method: "POST",

                body:
                    JSON.stringify({
                        username:
                            user.username
                    })
            }
        );


        if (contactSearch) {
            contactSearch.value = "";
        }


        showRailHint(
            "Contact added."
        );


        await loadContacts();


        const contact =
            contacts.find(
                (item) =>
                    Number(item.id) ===
                    Number(user.id)
            );


        if (contact) {

            openConversation(
                contact
            );
        }

    } catch (error) {

        console.error(
            "Add search result error:",
            error
        );

        showRailHint(
            error.message
        );
    }
}


// ========================================
// RAIL MESSAGE
// ========================================

function showRailHint(
    message
) {

    if (!railHint) {
        return;
    }


    railHint.textContent =
        message || "";
}


// ========================================
// OPEN CONVERSATION
// ========================================

async function openConversation(
    contact
) {

    activeContact =
        contact;


    if (emptyState) {
        emptyState.hidden =
            true;
    }


    if (convActive) {
        convActive.hidden =
            false;
    }


    if (convName) {

        convName.textContent =
            contact.displayName ||
            contact.username;
    }


    if (convAvatar) {

        convAvatar.textContent =
            getInitial(
                contact.displayName ||
                contact.username
            );
    }


    updateContactStatus(
        false
    );


    renderContacts();


    await loadMessages(
        contact.username
    );


    startMessageRefresh();


    if (composerInput) {
        composerInput.focus();
    }
}


// ========================================
// CONTACT STATUS
// ========================================

function updateContactStatus(
    online
) {

    if (!convStatus) {
        return;
    }


    convStatus.textContent =
        online
            ? "online"
            : "offline";
}


// ========================================
// LOAD MESSAGES
// ========================================

async function loadMessages(
    username
) {

    if (
        messageRefreshInProgress
    ) {
        return;
    }


    messageRefreshInProgress =
        true;


    try {

        const messages =
            await apiFetch(
                `/api/messages/${encodeURIComponent(username)}`
            );


        renderMessages(
            messages
        );

    } catch (error) {

        console.error(
            "Load messages error:",
            error
        );

    } finally {

        messageRefreshInProgress =
            false;
    }
}


// ========================================
// RENDER MESSAGES
// ========================================

function renderMessages(
    messages
) {

    if (!messagesEl) {
        return;
    }


    messagesEl.innerHTML = "";


    if (
        !messages ||
        messages.length === 0
    ) {

        return;
    }


    messages.forEach(
        (message) => {

            const bubble =
                createMessageElement(
                    message
                );


            messagesEl.appendChild(
                bubble
            );
        }
    );


    messagesEl.scrollTop =
        messagesEl.scrollHeight;
}


// ========================================
// MESSAGE ELEMENT
// ========================================

function createMessageElement(
    message
) {

    const wrapper =
        document.createElement(
            "div"
        );


    const outgoing =
        Number(
            message.sender_id
        ) ===
        Number(
            currentUser.id
        );


    wrapper.className =
        outgoing
            ? "message outgoing"
            : "message incoming";


    wrapper.dataset.messageId =
        message.id;


    const bubble =
        document.createElement(
            "div"
        );

    bubble.className =
        "message-bubble";


    const text =
        document.createElement(
            "p"
        );

    text.className =
        "message-text";

    text.textContent =
        message.text;


    bubble.appendChild(
        text
    );


    const meta =
        document.createElement(
            "div"
        );

    meta.className =
        "message-meta";


    const time =
        document.createElement(
            "span"
        );

    time.className =
        "message-time";

    time.textContent =
        formatTime(
            message.created_at
        );


    meta.appendChild(
        time
    );


    if (outgoing) {

        const status =
            document.createElement(
                "span"
            );

        status.className =
            "message-status";


        if (message.read) {

            status.textContent =
                "✓✓";

            status.title =
                "Read";

        } else if (
            message.delivered
        ) {

            status.textContent =
                "✓✓";

            status.title =
                "Delivered";

        } else {

            status.textContent =
                "✓";

            status.title =
                "Sent";
        }


        meta.appendChild(
            status
        );
    }


    bubble.appendChild(
        meta
    );


    if (outgoing) {

        const deleteBtn =
            document.createElement(
                "button"
            );


        deleteBtn.type =
            "button";

        deleteBtn.className =
            "delete-message-btn";

        deleteBtn.textContent =
            "🗑️";

        deleteBtn.title =
            "Delete message";


        deleteBtn.addEventListener(
            "click",
            async (event) => {

                event.stopPropagation();

                await deleteMessage(
                    message.id
                );
            }
        );


        wrapper.appendChild(
            bubble
        );

        wrapper.appendChild(
            deleteBtn
        );

    } else {

        wrapper.appendChild(
            bubble
        );
    }


    return wrapper;
}


// ========================================
// TIME
// ========================================

function formatTime(
    value
) {

    if (!value) {
        return "";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";
    }


    return date.toLocaleTimeString(
        [],
        {
            hour: "numeric",
            minute: "2-digit"
        }
    );
}


// ========================================
// DELETE MESSAGE
// ========================================

async function deleteMessage(
    messageId
) {

    const confirmed =
        window.confirm(
            "Delete this message?"
        );


    if (!confirmed) {
        return;
    }


    try {

        await apiFetch(
            `/api/messages/${messageId}`,
            {
                method: "DELETE"
            }
        );


        removeMessageFromUI(
            messageId
        );

    } catch (error) {

        console.error(
            "Delete message error:",
            error
        );


        alert(
            error.message ||
            "Could not delete message."
        );
    }
}


// ========================================
// REMOVE MESSAGE
// ========================================

function removeMessageFromUI(
    messageId
) {

    if (!messagesEl) {
        return;
    }


    const element =
        messagesEl.querySelector(
            `[data-message-id="${messageId}"]`
        );


    if (element) {
        element.remove();
    }
}


// ========================================
// SEND MESSAGE
// ========================================

if (composer) {

    composer.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            if (!activeContact) {
                return;
            }


            const text =
                composerInput?.value
                    .trim();


            if (!text) {
                return;
            }


            let expiresIn =
                null;


            if (
                disappearToggle &&
                disappearToggle.checked
            ) {

                expiresIn =
                    Number(
                        disappearDuration?.value ||
                        60000
                    );
            }


            try {

                const message =
                    await apiFetch(
                        "/api/messages",
                        {
                            method: "POST",

                            body:
                                JSON.stringify({
                                    receiverUsername:
                                        activeContact.username,

                                    text,

                                    expiresIn
                                })
                        }
                    );


                if (composerInput) {

                    composerInput.value =
                        "";
                }


                await loadMessages(
                    activeContact.username
                );


                console.log(
                    "Message sent:",
                    message
                );

            } catch (error) {

                console.error(
                    "Send message error:",
                    error
                );


                alert(
                    error.message ||
                    "Could not send message."
                );
            }
        }
    );
}


// ========================================
// MESSAGE REFRESH
// ========================================

function startMessageRefresh() {

    stopMessageRefresh();


    refreshTimer =
        setInterval(
            async () => {

                if (activeContact) {

                    await loadMessages(
                        activeContact.username
                    );
                }

            },
            1000
        );
}


function stopMessageRefresh() {

    if (refreshTimer) {

        clearInterval(
            refreshTimer
        );

        refreshTimer =
            null;
    }
}


// ========================================
// LOGOUT
// ========================================

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        () => {

            stopMessageRefresh();


            if (socket) {
                socket.disconnect();
            }


            localStorage.removeItem(
                "ember_token"
            );

            localStorage.removeItem(
                "ember_user"
            );


            window.location.replace(
                "index.html"
            );
        }
    );
}


// ========================================
// CLEANUP
// ========================================

window.addEventListener(
    "beforeunload",
    () => {

        stopMessageRefresh();


        if (socket) {
            socket.disconnect();
        }
    }
);