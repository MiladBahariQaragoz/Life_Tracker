const rawUrl = "postgresql://postgres:y#!UaYBh+hfg97&@db.tqbtsmirvalluhaxynxn.supabase.co:5432/postgres";

try {
    const url = new URL(rawUrl);
    console.log("Full Href:", url.href);
    console.log("Protocol:", url.protocol);
    console.log("Username:", url.username);
    console.log("Password:", url.password);
    console.log("Hostname:", url.hostname);
    console.log("Port:", url.port);
    console.log("Hash:", url.hash);

    if (url.password !== "y#!UaYBh+hfg97&") {
        console.log("❌ Password Mismatch! Parsing failed due to special characters.");
    } else {
        console.log("✅ Password parsed correctly.");
    }
} catch (e) {
    console.error("Parsing Error:", e.message);
}
