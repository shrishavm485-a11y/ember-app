// ========================================
// EMBER APP
// ========================================

const API_URL = "https://ember-app-1-vo3g.onrender.com";


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


// ========================================
// API HELPER
// ========================================

async function apiFetch(
    path,
    options = {}
) {

    const headers = {
        ...(options.headers || {}),
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };


    const response =
        await fetch(
            `${API_URL}${path}`,
            {
                ...options,
                headers
            }
        );


    if (
        response.status === 401
    ) {

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


    let data = null;

    try {

        data =
            await response.json();

    } catch {

        data = null;
    }


    if (!response.ok) {

        throw new Error(
            data?.error ||
            "Request failed."
        );
    }


    return data;
}


// ========================================
// INITIAL USER UI
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
// INITIAL
// ========================================

setupCurrentUser();

connectSocket();

loadContacts();


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
        io(
            API_URL,
            {
                auth: {
                    token
                }
            }
        );


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
                "Socket connection error:",
                error.message
            );
        }
    );


    // ========================================
    // NEW MESSAGE
    // ========================================

    socket.on(
        "new_message",
        async (message) => {

            console.log(
                "New message:",
                message
            );


            // If the message belongs to the
            // currently open conversation,
            // reload immediately.

            if (
                activeContact &&
                (
                    message.sender_id ===
                    activeContact.id
                    ||
                    message.receiver_id ===
                    activeContact.id
                )
            ) {

                await loadMessages(
                    activeContact.username
                );
            }


            // Refresh contacts too.

            loadContacts();
        }
    );


    // ========================================
    // MESSAGE DELIVERED
    // ========================================

    socket.on(
        "message_delivered",
        async (data) => {

            console.log(
                "Message delivered:",
                data.messageId
            );


            if (activeContact) {

                await loadMessages(
                    activeContact.username
                );
            }
        }
    );


    // ========================================
    // MESSAGE READ
    // ========================================

    socket.on(
        "message_read",
        async (data) => {

            console.log(
                "Message read:",
                data.messageId
            );


            if (activeContact) {

                await loadMessages(
                    activeContact.username
                );
            }
        }
    );


    // ========================================
    // MESSAGE DELETED
    // ========================================

    socket.on(
        "message_deleted",
        async (data) => {

            console.log(
                "Message deleted:",
                data.messageId
            );


            // Remove immediately from screen

            removeMessageFromUI(
                data.messageId
            );


            // Reload to keep everything synced

            if (activeContact) {

                await loadMessages(
                    activeContact.username
                );
            }
        }
    );


    // ========================================
    // PRESENCE
    // ========================================

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
// CONTACTS
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
    }
}


// ========================================
// RENDER CONTACTS
// ========================================

function renderContacts() {

    if (!contactList) {
        return;
    }


    contactList.innerHTML = "";


    if (
        !contacts ||
        contacts.length === 0
    ) {

        const empty =
            document.createElement(
                "p"
            );

        empty.className =
            "rail-hint";

        empty.textContent =
            "No conversations yet.";

        contactList.appendChild(
            empty
        );

        return;
    }


    contacts.forEach(
        (contact) => {

            const button =
                document.createElement(
                    "button"
                );


            button.className =
                "contact-item";


            if (
                activeContact &&
                activeContact.id ===
                contact.id
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


            info.appendChild(name);
            info.appendChild(handle);


            button.appendChild(avatar);
            button.appendChild(info);


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
// SEARCH / ADD CONTACT
// ========================================

if (addContactBtn) {

    addContactBtn.addEventListener(
        "click",
        addContact
    );
}


if (contactSearch) {

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

                    body: JSON.stringify({
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
                    item.id ===
                    addedUser.id
            );


        if (contact) {

            openConversation(
                contact
            );
        }

    } catch (error) {

        showRailHint(
            error.message
        );
    }
}


// ========================================
// RAIL HINT
// ========================================

function showRailHint(message) {

    if (!railHint) {
        return;
    }


    railHint.textContent =
        message;


    setTimeout(
        () => {

            if (railHint) {

                railHint.textContent =
                    "";
            }

        },
        3000
    );
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


    updateContactStatus(false);

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
// CREATE MESSAGE ELEMENT
// ========================================

function createMessageElement(
    message
) {

    const wrapper =
        document.createElement(
            "div"
        );


    const outgoing =
        Number(message.sender_id) ===
        Number(currentUser.id);


    wrapper.className =
        outgoing
            ? "message outgoing"
            : "message incoming";


    wrapper.dataset.messageId =
        message.id;


    // ========================================
    // BUBBLE
    // ========================================

    const bubble =
        document.createElement(
            "div"
        );


    bubble.className =
        "message-bubble";


    // ========================================
    // TEXT
    // ========================================

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


    // ========================================
    // META
    // ========================================

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


    // ========================================
    // STATUS
    // ========================================

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

        } else if (
            message.delivered
        ) {

            status.textContent =
                "✓✓";

        } else {

            status.textContent =
                "✓";
        }


        status.title =
            message.read
                ? "Read"
                : message.delivered
                    ? "Delivered"
                    : "Sent";


        meta.appendChild(
            status
        );
    }


    bubble.appendChild(
        meta
    );


    // ========================================
    // DELETE BUTTON
    // ========================================

    if (outgoing) {

        const deleteBtn =
            document.createElement(
                "button"
            );


        deleteBtn.className =
            "delete-message-btn";


        deleteBtn.type =
            "button";


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
// FORMAT TIME
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
// REMOVE MESSAGE FROM UI
// ========================================

function removeMessageFromUI(
    messageId
) {

    if (!messagesEl) {
        return;
    }


    const message =
        messagesEl.querySelector(
            `[data-message-id="${messageId}"]`
        );


    if (message) {

        message.remove();
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


            // ========================================
            // DISAPPEARING MESSAGE
            // ========================================

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

                            body: JSON.stringify({
                                receiverUsername:
                                    activeContact.username,

                                text,

                                expiresIn
                            })
                        }
                    );


                // Clear input

                if (composerInput) {

                    composerInput.value =
                        "";
                }


                // Immediately reload

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
// MESSAGE REFRESH FALLBACK
// ========================================

function startMessageRefresh() {

    stopMessageRefresh();


    refreshTimer =
        setInterval(
            async () => {

                if (
                    activeContact
                ) {

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