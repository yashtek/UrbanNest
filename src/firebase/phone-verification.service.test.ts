import { afterEach, beforeEach, expect, test } from "bun:test";
import { generateKeyPairSync } from "node:crypto";
import jwt from "jsonwebtoken";
import { verifyFirebasePhone } from "./phone-verification.service";
const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const other=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const originalFetch=globalThis.fetch;
const oldNumber=process.env.FIREBASE_PROJECT_NUMBER, oldId=process.env.FIREBASE_PROJECT_ID;
const issuer='https://fpnv.googleapis.com/projects/123456';
const phone='+919876543210';
function token(claims: object={}, key=privateKey) {
 return jwt.sign({sub:phone,iss:issuer,aud:[issuer,'https://fpnv.googleapis.com/projects/test-project'],exp:Math.floor(Date.now()/1000)+300,...claims},key,{algorithm:'ES256',keyid:'test-key'});
}
beforeEach(()=>{
 process.env.FIREBASE_PROJECT_NUMBER='123456';process.env.FIREBASE_PROJECT_ID='test-project';
 globalThis.fetch=(async()=>Response.json({keys:[{...publicKey.export({format:'jwk'}),kid:'test-key',alg:'ES256'}]})) as unknown as typeof fetch;
});
afterEach(()=>{
 globalThis.fetch=originalFetch;
 if(oldNumber===undefined)delete process.env.FIREBASE_PROJECT_NUMBER;else process.env.FIREBASE_PROJECT_NUMBER=oldNumber;
 if(oldId===undefined)delete process.env.FIREBASE_PROJECT_ID;else process.env.FIREBASE_PROJECT_ID=oldId;
});
test('Google-signed PNV claims match expected project and phone',async()=>{
 expect(await verifyFirebasePhone(phone,token())).toEqual({phoneNumber:phone,phoneVerified:true});
});
test('rejects wrong signature, issuer, audience, expired token and mismatched phone',async()=>{
 for(const value of [token({},other.privateKey),token({iss:'wrong'}),token({aud:[issuer]}),token({exp:1}), 'console-test-session-token'])
  await expect(verifyFirebasePhone(phone,value)).rejects.toMatchObject({statusCode:401});
 await expect(verifyFirebasePhone('+919876543211',token())).rejects.toMatchObject({statusCode:403});
});
test('requires trusted project configuration',async()=>{
 delete process.env.FIREBASE_PROJECT_NUMBER;
 await expect(verifyFirebasePhone(phone,token())).rejects.toMatchObject({statusCode:503});
});
