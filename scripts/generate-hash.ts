import bcrypt from "bcrypt";

const password = "demo-password";
const hash = await bcrypt.hash(password, 10);
console.log("HASH:", hash);

const valid = await bcrypt.compare(password, hash);
console.log("VERIFY:", valid);
