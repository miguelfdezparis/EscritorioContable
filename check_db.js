import Database from "better-sqlite3";
const db = new Database("blog.db");
try {
    const posts = db.prepare("SELECT COUNT(*) as count FROM posts").get();
    const exp = db.prepare("SELECT COUNT(*) as count FROM experience").get();
    console.log("Posts:", posts.count);
    console.log("Experience:", exp.count);
} catch (e) {
    console.error("Error:", e.message);
}
