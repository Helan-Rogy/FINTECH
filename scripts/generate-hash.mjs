import bcrypt from "bcryptjs";

const password = "demo-password";
const hash = await bcrypt.hash(password, 10);
console.log("Hash:", hash);

// Verify it works
const valid = await bcrypt.compare(password, hash);
console.log("Verify:", valid);
