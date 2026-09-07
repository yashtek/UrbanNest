import { afterEach, beforeEach, expect, mock, test } from "bun:test";
const rows = new Map<string, any>();
const used = new Set<string>();
mock.module("../db/db", () => ({ getDB: () => ({ collection: (name: string) => {
  if (name === 'signup_otp_locks') return { findOneAndUpdate: async () => ({}), updateOne: async () => ({}) };
  if (name === 'signup_msg91_used_tokens') return { insertOne: async (row: any) => { if (used.has(row._id)) throw {code:11000}; used.add(row._id); } };
  return {
    findOne: async (filter: any) => rows.get(filter.phoneNumber),
    updateOne: async (filter: any, update: any) => {
      const row = rows.get(filter.phoneNumber) ?? {};
      Object.assign(row, update.$set);
      for (const key of Object.keys(update.$unset ?? {})) delete row[key];
      for (const [key, amount] of Object.entries(update.$inc ?? {})) row[key] = (row[key] ?? 0) + Number(amount);
      rows.set(filter.phoneNumber, row);
    },
  };
} }) }));
const { sendMsg91SignupOtp, verifyMsg91SignupOtp } = await import('./msg91-signup.service');
const savedFetch = globalThis.fetch;
const savedKey = process.env.MSG91_AUTH_KEY, savedTemplate = process.env.MSG91_TEMP_ID;
let calls: {url: URL; init: RequestInit}[];
let reject = false;
beforeEach(() => {
  rows.clear(); calls=[]; reject=false;
  process.env.MSG91_AUTH_KEY='test-authkey'; delete process.env.MSG91_TEMP_ID;
  globalThis.fetch=(async (url: any, init: any) => {
    calls.push({url:new URL(String(url)),init});
    return Response.json(reject ? {type:'error',message:'Invalid OTP'} : {type:'success',message:String(url).includes('/otp/verify') ? 'OTP verified success' : '3567736c53515771356c4878'});
  }) as unknown as typeof fetch;
});
afterEach(() => {
  globalThis.fetch=savedFetch;
  if(savedKey===undefined)delete process.env.MSG91_AUTH_KEY;else process.env.MSG91_AUTH_KEY=savedKey;
  if(savedTemplate===undefined)delete process.env.MSG91_TEMP_ID;else process.env.MSG91_TEMP_ID=savedTemplate;
});
const phone='+919876543210';
test('send works without template configuration and uses only authkey', async () => {
  await sendMsg91SignupOtp(phone);
  expect(calls[0].url.pathname).toBe('/api/v5/otp');
  expect(calls[0].url.searchParams.has('template_id')).toBe(false);
  expect(calls[0].init.body).toBe('{}');
  expect(calls[0].url.searchParams.get('mobile')).toBe('919876543210');
  expect(calls[0].init.method).toBe('POST');
  expect(new Headers(calls[0].init.headers).get('authkey')).toBe('test-authkey');
  await verifyMsg91SignupOtp(phone,{otp:'012345'});
  expect(calls[1].url.pathname).toBe('/api/v5/otp/verify');
  expect(calls[1].url.searchParams.get('otp')).toBe('012345');
  expect(calls[1].init.method).toBe('GET');
  expect(rows.get(phone).verifiedAt).toBeInstanceOf(Date);
  expect(rows.get(phone).codeHash).toBeUndefined();
});
test('invalid OTP does not mark verified and attempts are limited', async () => {
  await sendMsg91SignupOtp(phone); reject=true;
  for(let i=0;i<5;i++) await expect(verifyMsg91SignupOtp(phone,{otp:'123456'})).rejects.toMatchObject({statusCode:400});
  await expect(verifyMsg91SignupOtp(phone,{otp:'123456'})).rejects.toMatchObject({statusCode:429});
  expect(rows.get(phone).verifiedAt).toBeUndefined();
});
test('missing, expired and already consumed requests reject verification', async () => {
  await expect(verifyMsg91SignupOtp(phone,{otp:'123456'})).rejects.toMatchObject({statusCode:400});
  await sendMsg91SignupOtp(phone);
  rows.get(phone).otpExpiresAt=new Date(0);
  await expect(verifyMsg91SignupOtp(phone,{otp:'123456'})).rejects.toMatchObject({statusCode:400});
  rows.get(phone).otpExpiresAt=new Date(Date.now()+300000);
  await verifyMsg91SignupOtp(phone,{otp:'123456'});
  await expect(verifyMsg91SignupOtp(phone,{otp:'123456'})).rejects.toMatchObject({statusCode:400});
});
test('resend cooldown preserves attempt limits', async () => {
  await sendMsg91SignupOtp(phone);
  await expect(sendMsg91SignupOtp(phone)).rejects.toMatchObject({statusCode:429});
  rows.get(phone).lastSentAt=new Date(Date.now()-31000); rows.get(phone).attempts=4;
  await sendMsg91SignupOtp(phone);
  expect(rows.get(phone).attempts).toBe(4);
});
test('provider rejection never reports send success', async () => {
  reject=true;
  await expect(sendMsg91SignupOtp(phone)).rejects.toMatchObject({statusCode:502});
  expect(rows.get(phone).provider).toBeUndefined();
});

test('acceptance returns a traceable request ID without claiming delivery', async () => {
  const result=await sendMsg91SignupOtp(phone);
  expect(result.requestId).toBe('3567736c53515771356c4878');
  expect(result.status).toBe('accepted');
  expect(result.deliveryStatus).toBe('unknown');
  expect(rows.get(phone).providerRequestId).toBe(result.requestId);
});
test('success without a provider reference does not invent a request ID', async () => {
  globalThis.fetch=(async()=>Response.json({type:'success',message:'OTP accepted'})) as unknown as typeof fetch;
  const result=await sendMsg91SignupOtp(phone);
  expect(result.requestId).toBeNull();
  expect(result.deliveryStatus).toBe('unknown');
});

test('a configured template ID is also ignored', async () => {
  process.env.MSG91_TEMP_ID='must-not-be-sent';
  await sendMsg91SignupOtp(phone);
  expect(calls[0].url.searchParams.has('template_id')).toBe(false);
  expect(JSON.stringify(calls[0])).not.toContain('must-not-be-sent');
});
