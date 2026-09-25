// ========================================
// EMBER CHAT SERVER
// ========================================

require("dotenv").config();

const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

const pool = require("./db");


// ========================================
// APP SETUP
// ========================================

const app = express();

const server = http.createServer(app);

const PORT =
    Number(process.env.PORT) || 3000;

const JWT_SECRET =
    process.env.JWT_SECRET ||
    "change-this-secret";


// ========================================
// MIDDLEWARE
// ========================================

app.use(
    cors({
        origin: (origin, callback) => {

            // Allow requests with no origin
            // such as Postman/server requests.
            if (!origin) {
                return callback(null, true);
            }

            // Allow local development.
            if (
                origin.startsWith(
                    "http://localhost:"
                ) ||
                origin.startsWith(
                    "http://127.0.0.1:"
                )
            ) {
                return callback(null, true);
            }

            // Allow your deployed Render site.
            if (
                origin.endsWith(
                    ".onrender.com"
                )
            ) {
                return callback(null, true);
            }

            // Optional custom frontend URL.
            if (
                process.env.FRONTEND_URL &&
                origin ===
                    process.env.FRONTEND_URL.replace(
                        /\/$/,
                        ""
                    )
            ) {
                return callback(null, true);
            }

            return callback(
                new Error("CORS not allowed.")
            );
        }
    })
);

app.use(
    express.json({
        limit: "1mb"
    })
);


// ========================================
// SOCKET.IO
// ========================================

const io =
    new Server(server, {
        cors: {
            origin: true,
            methods: [
                "GET",
                "POST",
                "PATCH",
                "DELETE"
            ]
        }
    });


// ========================================
// STATIC FRONTEND
// ========================================

// Home page
app.get(
    "/",
    (req, res) => {
        res.sendFile(
            path.join(
                __dirname,
                "index.html"
            )
        );
    }
);


// Chat page
app.get(
    "/app.html",
    (req, res) => {
        res.sendFile(
            path.join(
                __dirname,
                "app.html"
            )
        );
    }
);


// CSS files
app.use(
    "/css",
    express.static(
        path.join(
            __dirname,
            "css"
        )
    )
);


// JavaScript files
app.use(
    "/js",
    express.static(
        path.join(
            __dirname,
            "js"
        )
    )
);


// ========================================
// HEALTH CHECK
// ========================================

app.get(
    "/api/health",
    (req, res) => {

        res.json({
            app: "Ember",
            status: "online"
        });

    }
);


// ========================================
// JWT
// ========================================

function createToken(user) {

    return jwt.sign(
        {
            id: user.id,
            username: user.username
        },
        JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );
}


function authenticateToken(
    req,
    res,
    next
) {

    const authorization =
        req.headers.authorization;

    if (
        !authorization ||
        !authorization.startsWith(
            "Bearer "
        )
    ) {

        return res.status(401).json({
            error:
                "Authentication required."
        });
    }

    const token =
        authorization.substring(7);

    try {

        const decoded =
            jwt.verify(
                token,
                JWT_SECRET
            );

        req.user =
            decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            error:
                "Invalid or expired token."
        });

    }
}


// ========================================
// SIGN UP
// ========================================

app.post(
    "/api/auth/signup",
    async (req, res) => {

        try {

            const displayName =
                String(
                    req.body.displayName || ""
                ).trim();

            const username =
                String(
                    req.body.username || ""
                )
                    .trim()
                    .toLowerCase();

            const password =
                String(
                    req.body.password || ""
                );


            if (!displayName) {

                return res.status(400).json({
                    error:
                        "Display name is required."
                });
            }


            if (!username) {

                return res.status(400).json({
                    error:
                        "Username is required."
                });
            }


            if (
                !/^[a-z0-9_]{3,30}$/.test(
                    username
                )
            ) {

                return res.status(400).json({
                    error:
                        "Username must be 3-30 characters and use only letters, numbers, and underscores."
                });
            }


            if (password.length < 4) {

                return res.status(400).json({
                    error:
                        "Password must be at least 4 characters."
                });
            }


            const existing =
                await pool.query(
                    `
                    SELECT id
                    FROM users
                    WHERE username = $1
                    `,
                    [username]
                );


            if (
                existing.rows.length > 0
            ) {

                return res.status(409).json({
                    error:
                        "Username already exists."
                });
            }


            const passwordHash =
                await bcrypt.hash(
                    password,
                    10
                );


            const result =
                await pool.query(
                    `
                    INSERT INTO users
                    (
                        username,
                        password_hash,
                        display_name
                    )
                    VALUES
                    (
                        $1,
                        $2,
                        $3
                    )
                    RETURNING
                        id,
                        username,
                        display_name,
                        color
                    `,
                    [
                        username,
                        passwordHash,
                        displayName
                    ]
                );


            const user =
                result.rows[0];


            const token =
                createToken(user);


            res.status(201).json({

                token,

                user: {
                    id: user.id,

                    username:
                        user.username,

                    displayName:
                        user.display_name,

                    color:
                        user.color
                }

            });

        } catch (error) {

            console.error(
                "Signup error:",
                error
            );

            res.status(500).json({
                error:
                    "Server error."
            });
        }
    }
);


// ========================================
// LOGIN
// ========================================

app.post(
    "/api/auth/login",
    async (req, res) => {

        try {

            const username =
                String(
                    req.body.username || ""
                )
                    .trim()
                    .toLowerCase();

            const password =
                String(
                    req.body.password || ""
                );


            if (
                !username ||
                !password
            ) {

                return res.status(400).json({
                    error:
                        "Username and password are required."
                });
            }


            const result =
                await pool.query(
                    `
                    SELECT
                        id,
                        username,
                        password_hash,
                        display_name,
                        color
                    FROM users
                    WHERE username = $1
                    `,
                    [username]
                );


            if (
                result.rows.length === 0
            ) {

                return res.status(401).json({
                    error:
                        "Invalid username or password."
                });
            }


            const user =
                result.rows[0];


            const validPassword =
                await bcrypt.compare(
                    password,
                    user.password_hash
                );


            if (!validPassword) {

                return res.status(401).json({
                    error:
                        "Invalid username or password."
                });
            }


            const token =
                createToken(user);


            res.json({

                token,

                user: {
                    id: user.id,

                    username:
                        user.username,

                    displayName:
                        user.display_name,

                    color:
                        user.color
                }

            });

        } catch (error) {

            console.error(
                "Login error:",
                error
            );

            res.status(500).json({
                error:
                    "Server error."
            });
        }
    }
);


// ========================================
// USER SEARCH
// ========================================

app.get(
    "/api/users/search",
    authenticateToken,
    async (req, res) => {

        try {

            const query =
                String(
                    req.query.q || ""
                )
                    .trim()
                    .toLowerCase();


            if (!query) {
                return res.json([]);
            }


            const result =
                await pool.query(
                    `
                    SELECT
                        id,
                        username,
                        display_name,
                        color
                    FROM users
                    WHERE
                        (
                            username ILIKE $1
                            OR
                            display_name ILIKE $1
                        )
                        AND id <> $2
                    ORDER BY username
                    LIMIT 20
                    `,
                    [
                        `%${query}%`,
                        req.user.id
                    ]
                );


            res.json(
                result.rows.map(
                    (user) => ({
                        id:
                            user.id,

                        username:
                            user.username,

                        displayName:
                            user.display_name,

                        color:
                            user.color
                    })
                )
            );

        } catch (error) {

            console.error(
                "User search error:",
                error
            );

            res.status(500).json({
                error:
                    "Server error."
            });
        }
    }
);


// ========================================
// CONTACTS
// ========================================

app.get(
    "/api/contacts",
    authenticateToken,
    async (req, res) => {

        try {

            const result =
                await pool.query(
                    `
                    SELECT
                        u.id,
                        u.username,
                        u.display_name,
                        u.color
                    FROM contacts c
                    JOIN users u
                        ON u.id = c.contact_id
                    WHERE c.user_id = $1
                    ORDER BY
                        LOWER(u.display_name),
                        LOWER(u.username)
                    `,
                    [req.user.id]
                );


            res.json(
                result.rows.map(
                    (user) => ({
                        id:
                            user.id,

                        username:
                            user.username,

                        displayName:
                            user.display_name,

                        color:
                            user.color
                    })
                )
            );

        } catch (error) {

            console.error(
                "Load contacts error:",
                error
            );

            res.status(500).json({
                error:
                    "Server error."
            });
        }
    }
);


app.post(
    "/api/contacts",
    authenticateToken,
    async (req, res) => {

        try {

            const username =
                String(
                    req.body.username || ""
                )
                    .trim()
                    .toLowerCase();


            if (!username) {

                return res.status(400).json({
                    error:
                        "Username is required."
                });
            }


            const result =
                await pool.query(
                    `
                    SELECT
                        id,
                        username,
                        display_name,
                        color
                    FROM users
                    WHERE username = $1
                    `,
                    [username]
                );


            if (
                result.rows.length === 0
            ) {

                return res.status(404).json({
                    error:
                        "User not found."
                });
            }


            const contact =
                result.rows[0];


            if (
                Number(contact.id) ===
                Number(req.user.id)
            ) {

                return res.status(400).json({
                    error:
                        "You cannot add yourself."
                });
            }


            // Add contact for current user.
            await pool.query(
                `
                INSERT INTO contacts
                (
                    user_id,
                    contact_id
                )
                VALUES
                (
                    $1,
                    $2
                )
                ON CONFLICT
                (
                    user_id,
                    contact_id
                )
                DO NOTHING
                `,
                [
                    req.user.id,
                    contact.id
                ]
            );


            // Add current user for the contact too.
            await pool.query(
                `
                INSERT INTO contacts
                (
                    user_id,
                    contact_id
                )
                VALUES
                (
                    $1,
                    $2
                )
                ON CONFLICT
                (
                    user_id,
                    contact_id
                )
                DO NOTHING
                `,
                [
                    contact.id,
                    req.user.id
                ]
            );


            res.status(201).json({

                user: {
                    id:
                        contact.id,

                    username:
                        contact.username,

                    displayName:
                        contact.display_name,

                    color:
                        contact.color
                }

            });

        } catch (error) {

            console.error(
                "Add contact error:",
                error
            );

            res.status(500).json({
                error:
                    "Server error."
            });
        }
    }
);


// ========================================
// USER HELPERS
// ========================================

async function findUserByUsername(
    username
) {

    const result =
        await pool.query(
            `
            SELECT
                id,
                username,
                display_name,
                color
            FROM users
            WHERE username = $1
            `,
            [
                String(username)
                    .trim()
                    .toLowerCase()
            ]
        );

    return (
        result.rows[0] ||
        null
    );
}


// ========================================
// ONLINE USERS
// ========================================

const onlineUsers =
    new Map();


// ========================================
// GET MESSAGES
// ========================================

app.get(
    "/api/messages/:username",
    authenticateToken,
    async (req, res) => {

        try {

            const contact =
                await findUserByUsername(
                    req.params.username
                );


            if (!contact) {

                return res.status(404).json({
                    error:
                        "User not found."
                });
            }


            // Delete expired messages first.
            await pool.query(
                `
                DELETE FROM messages
                WHERE
                    expires_at IS NOT NULL
                    AND expires_at <= NOW()
                `
            );


            const result =
                await pool.query(
                    `
                    SELECT
                        id,
                        sender_id,
                        receiver_id,
                        text,
                        created_at,
                        read,
                        delivered,
                        expires_at
                    FROM messages
                    WHERE
                        (
                            sender_id = $1
                            AND receiver_id = $2
                        )
                        OR
                        (
                            sender_id = $2
                            AND receiver_id = $1
                        )
                    ORDER BY created_at ASC
                    `,
                    [
                        req.user.id,
                        contact.id
                    ]
                );


            // Messages received by current user.
            const incomingMessages =
                result.rows.filter(
                    (message) =>
                        Number(
                            message.receiver_id
                        ) ===
                        Number(
                            req.user.id
                        )
                );


            // Mark incoming messages as
            // delivered + read.
            if (
                incomingMessages.length > 0
            ) {

                const incomingIds =
                    incomingMessages.map(
                        (message) =>
                            message.id
                    );


                await pool.query(
                    `
                    UPDATE messages
                    SET
                        delivered = TRUE,
                        read = TRUE
                    WHERE
                        id = ANY($1::int[])
                    `,
                    [incomingIds]
                );


                // Notify the senders.
                for (
                    const message
                    of incomingMessages
                ) {

                    io.to(
                        `user:${message.sender_id}`
                    ).emit(
                        "message_delivered",
                        {
                            messageId:
                                message.id
                        }
                    );


                    io.to(
                        `user:${message.sender_id}`
                    ).emit(
                        "message_read",
                        {
                            messageId:
                                message.id
                        }
                    );
                }
            }


            // Get updated values.
            const updated =
                await pool.query(
                    `
                    SELECT
                        id,
                        sender_id,
                        receiver_id,
                        text,
                        created_at,
                        read,
                        delivered,
                        expires_at
                    FROM messages
                    WHERE
                        (
                            sender_id = $1
                            AND receiver_id = $2
                        )
                        OR
                        (
                            sender_id = $2
                            AND receiver_id = $1
                        )
                    ORDER BY created_at ASC
                    `,
                    [
                        req.user.id,
                        contact.id
                    ]
                );


            res.json(
                updated.rows
            );

        } catch (error) {

            console.error(
                "Get messages error:",
                error
            );

            res.status(500).json({
                error:
                    "Server error."
            });
        }
    }
);


// ========================================
// SEND MESSAGE
// ========================================

app.post(
    "/api/messages",
    authenticateToken,
    async (req, res) => {

        try {

            const receiverUsername =
                String(
                    req.body.receiverUsername ||
                    ""
                )
                    .trim()
                    .toLowerCase();

            const text =
                String(
                    req.body.text || ""
                ).trim();

            const expiresIn =
                req.body.expiresIn == null
                    ? null
                    : Number(
                        req.body.expiresIn
                    );


            if (!receiverUsername) {

                return res.status(400).json({
                    error:
                        "Receiver is required."
                });
            }


            if (!text) {

                return res.status(400).json({
                    error:
                        "Message cannot be empty."
                });
            }


            if (text.length > 5000) {

                return res.status(400).json({
                    error:
                        "Message is too long."
                });
            }


            const receiver =
                await findUserByUsername(
                    receiverUsername
                );


            if (!receiver) {

                return res.status(404).json({
                    error:
                        "Receiver not found."
                });
            }


            if (
                Number(receiver.id) ===
                Number(req.user.id)
            ) {

                return res.status(400).json({
                    error:
                        "You cannot message yourself."
                });
            }


            // =================================
            // DISAPPEARING MESSAGE TIMER
            // =================================

            let expiresAt = null;


            if (
                Number.isFinite(
                    expiresIn
                ) &&
                expiresIn > 0
            ) {

                // Maximum 7 days.
                const maxExpiry =
                    7 *
                    24 *
                    60 *
                    60 *
                    1000;

                const safeExpiry =
                    Math.min(
                        expiresIn,
                        maxExpiry
                    );


                expiresAt =
                    new Date(
                        Date.now() +
                        safeExpiry
                    );
            }


            // =================================
            // DELIVERY STATUS
            // =================================

            const receiverOnline =
                onlineUsers.has(
                    Number(
                        receiver.id
                    )
                );


            // =================================
            // INSERT MESSAGE
            // =================================

            const result =
                await pool.query(
                    `
                    INSERT INTO messages
                    (
                        sender_id,
                        receiver_id,
                        text,
                        delivered,
                        expires_at
                    )
                    VALUES
                    (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5
                    )
                    RETURNING
                        id,
                        sender_id,
                        receiver_id,
                        text,
                        created_at,
                        read,
                        delivered,
                        expires_at
                    `,
                    [
                        req.user.id,
                        receiver.id,
                        text,
                        receiverOnline,
                        expiresAt
                    ]
                );


            const message =
                result.rows[0];


            // Send to receiver.
            io.to(
                `user:${receiver.id}`
            ).emit(
                "new_message",
                message
            );


            // Send to sender.
            io.to(
                `user:${req.user.id}`
            ).emit(
                "new_message",
                message
            );


            // Tell sender that the message
            // was delivered if receiver is online.
            if (receiverOnline) {

                io.to(
                    `user:${req.user.id}`
                ).emit(
                    "message_delivered",
                    {
                        messageId:
                            message.id
                    }
                );
            }


            res.status(201).json(
                message
            );

        } catch (error) {

            console.error(
                "Send message error:",
                error
            );

            res.status(500).json({
                error:
                    "Server error."
            });
        }
    }
);


// ========================================
// MARK MESSAGE READ
// ========================================

app.patch(
    "/api/messages/:id/read",
    authenticateToken,
    async (req, res) => {

        try {

            const messageId =
                Number(
                    req.params.id
                );


            if (
                !Number.isInteger(
                    messageId
                )
            ) {

                return res.status(400).json({
                    error:
                        "Invalid message ID."
                });
            }


            const result =
                await pool.query(
                    `
                    UPDATE messages
                    SET
                        delivered = TRUE,
                        read = TRUE
                    WHERE
                        id = $1
                        AND receiver_id = $2
                    RETURNING
                        id,
                        sender_id,
                        receiver_id
                    `,
                    [
                        messageId,
                        req.user.id
                    ]
                );


            if (
                result.rows.length === 0
            ) {

                return res.status(404).json({
                    error:
                        "Message not found."
                });
            }


            const message =
                result.rows[0];


            io.to(
                `user:${message.sender_id}`
            ).emit(
                "message_delivered",
                {
                    messageId:
                        message.id
                }
            );


            io.to(
                `user:${message.sender_id}`
            ).emit(
                "message_read",
                {
                    messageId:
                        message.id
                }
            );


            res.json({
                message:
                    "Message marked as read."
            });

        } catch (error) {

            console.error(
                "Mark read error:",
                error
            );

            res.status(500).json({
                error:
                    "Server error."
            });
        }
    }
);


// ========================================
// DELETE MESSAGE
// ========================================

app.delete(
    "/api/messages/:id",
    authenticateToken,
    async (req, res) => {

        try {

            const messageId =
                Number(
                    req.params.id
                );


            if (
                !Number.isInteger(
                    messageId
                )
            ) {

                return res.status(400).json({
                    error:
                        "Invalid message ID."
                });
            }


            const result =
                await pool.query(
                    `
                    DELETE FROM messages
                    WHERE
                        id = $1
                        AND sender_id = $2
                    RETURNING
                        id,
                        sender_id,
                        receiver_id
                    `,
                    [
                        messageId,
                        req.user.id
                    ]
                );


            if (
                result.rows.length === 0
            ) {

                return res.status(404).json({
                    error:
                        "Message not found or you cannot delete it."
                });
            }


            const deleted =
                result.rows[0];


            io.to(
                `user:${deleted.receiver_id}`
            ).emit(
                "message_deleted",
                {
                    messageId:
                        deleted.id
                }
            );


            io.to(
                `user:${deleted.sender_id}`
            ).emit(
                "message_deleted",
                {
                    messageId:
                        deleted.id
                }
            );


            res.json({
                message:
                    "Message deleted.",

                messageId:
                    deleted.id
            });

        } catch (error) {

            console.error(
                "Delete message error:",
                error
            );

            res.status(500).json({
                error:
                    "Server error."
            });
        }
    }
);


// ========================================
// SOCKET AUTH
// ========================================

io.use(
    (socket, next) => {

        try {

            const token =
                socket.handshake.auth?.token;


            if (!token) {

                return next(
                    new Error(
                        "Authentication required."
                    )
                );
            }


            const user =
                jwt.verify(
                    token,
                    JWT_SECRET
                );


            socket.user =
                user;

            next();

        } catch (error) {

            next(
                new Error(
                    "Invalid token."
                )
            );
        }
    }
);


// ========================================
// SOCKET CONNECTION
// ========================================

io.on(
    "connection",
    (socket) => {

        const userId =
            Number(
                socket.user.id
            );


        onlineUsers.set(
            userId,
            socket.id
        );


        socket.join(
            `user:${userId}`
        );


        console.log(
            `User ${userId} connected.`
        );


        // Tell everyone this user is online.
        io.emit(
            "presence_changed",
            {
                userId,
                online: true
            }
        );


        // ====================================
        // MARK READ THROUGH SOCKET
        // ====================================

        socket.on(
            "mark_message_read",
            async (messageId) => {

                try {

                    const id =
                        Number(
                            messageId
                        );


                    if (
                        !Number.isInteger(
                            id
                        )
                    ) {
                        return;
                    }


                    const result =
                        await pool.query(
                            `
                            UPDATE messages
                            SET
                                delivered = TRUE,
                                read = TRUE
                            WHERE
                                id = $1
                                AND receiver_id = $2
                            RETURNING
                                id,
                                sender_id,
                                receiver_id
                            `,
                            [
                                id,
                                userId
                            ]
                        );


                    if (
                        result.rows.length === 0
                    ) {
                        return;
                    }


                    const message =
                        result.rows[0];


                    io.to(
                        `user:${message.sender_id}`
                    ).emit(
                        "message_delivered",
                        {
                            messageId:
                                message.id
                        }
                    );


                    io.to(
                        `user:${message.sender_id}`
                    ).emit(
                        "message_read",
                        {
                            messageId:
                                message.id
                        }
                    );

                } catch (error) {

                    console.error(
                        "Socket read error:",
                        error
                    );
                }
            }
        );


        // ====================================
        // DISCONNECT
        // ====================================

        socket.on(
            "disconnect",
            () => {

                // Only remove presence if this
                // is still the active socket.
                if (
                    onlineUsers.get(userId) ===
                    socket.id
                ) {

                    onlineUsers.delete(
                        userId
                    );


                    io.emit(
                        "presence_changed",
                        {
                            userId,
                            online: false
                        }
                    );
                }


                console.log(
                    `User ${userId} disconnected.`
                );
            }
        );
    }
);


// ========================================
// EXPIRED MESSAGE CLEANUP
// ========================================

async function cleanupExpiredMessages() {

    try {

        const result =
            await pool.query(
                `
                DELETE FROM messages
                WHERE
                    expires_at IS NOT NULL
                    AND expires_at <= NOW()
                RETURNING
                    id,
                    sender_id,
                    receiver_id
                `
            );


        for (
            const message
            of result.rows
        ) {

            io.to(
                `user:${message.sender_id}`
            ).emit(
                "message_deleted",
                {
                    messageId:
                        message.id
                }
            );


            io.to(
                `user:${message.receiver_id}`
            ).emit(
                "message_deleted",
                {
                    messageId:
                        message.id
                }
            );
        }


        if (
            result.rows.length > 0
        ) {

            console.log(
                `Deleted ${result.rows.length} expired message(s).`
            );
        }

    } catch (error) {

        console.error(
            "Expired message cleanup error:",
            error
        );
    }
}


// Run every 10 seconds.
setInterval(
    cleanupExpiredMessages,
    10000
);


// ========================================
// DATABASE SETUP
// ========================================

async function ensureDatabase() {

    await pool.query(
        `
        ALTER TABLE messages
        ADD COLUMN IF NOT EXISTS
        delivered BOOLEAN DEFAULT FALSE
        `
    );

    console.log(
        "Database check complete."
    );
}


// ========================================
// START SERVER
// ========================================

async function startServer() {

    try {

        await ensureDatabase();


        server.listen(
            PORT,
            "0.0.0.0",
            () => {

                console.log(
                    `Ember server running on port ${PORT}`
                );

            }
        );

    } catch (error) {

        console.error(
            "Failed to start Ember:",
            error
        );

        process.exit(1);
    }
}


startServer();