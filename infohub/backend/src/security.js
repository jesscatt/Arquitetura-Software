const crypto=require("crypto");
const SESSION_TTL_SEC=8*60*60;
function authSecret(){const secret=process.env.AUTH_SECRET;if(!secret||secret.length<32)throw new Error("AUTH_SECRET ausente ou muito curto. Configure pelo menos 32 caracteres.");return secret;}
function signSession(userId){const exp=Math.floor(Date.now()/1000)+SESSION_TTL_SEC;const payload=`${userId}.${exp}`;const sig=crypto.createHmac("sha256",authSecret()).update(payload).digest("base64url");return `v1.${payload}.${sig}`;}
function verifySession(token){const parts=String(token||"").split(".");if(parts.length!==4||parts[0]!=="v1")return null;const [,userId,exp,sig]=parts;const expNumber=Number(exp);if(!/^\d+$/.test(userId)||!Number.isSafeInteger(expNumber)||expNumber<Math.floor(Date.now()/1000))return null;const payload=`${userId}.${exp}`;const expected=crypto.createHmac("sha256",authSecret()).update(payload).digest("base64url");if(sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;return Number(userId);}
module.exports={signSession,verifySession};
