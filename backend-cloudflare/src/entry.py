from workers import Response, WorkerEntrypoint
import uuid
import hashlib
import secrets
from datetime import datetime, timedelta
import json

def js_to_py(obj):
    """Convert JavaScript proxy object to Python dict/list"""
    if obj is None:
        return None
    if hasattr(obj, 'to_py'):
        return obj.to_py()
    if hasattr(obj, 'length'):
        return [js_to_py(obj[i]) for i in range(obj.length)]
    if hasattr(obj, 'keys'):
        result = {}
        for key in obj.keys():
            result[key] = getattr(obj, key, None)
        return result
    return obj

def row_to_dict(row):
    """Convert a D1 row (JsProxy) to a Python dict"""
    if row is None:
        return None
    if isinstance(row, dict):
        return row
    result = {}
    if hasattr(row, 'keys'):
        for key in row.keys():
            val = getattr(row, key, None)
            result[key] = val
    return result

def generate_uuid():
    return str(uuid.uuid4())

def generate_otp():
    return str(secrets.randbelow(900000) + 100000)

def generate_referral_code():
    return secrets.token_hex(4).upper()

def generate_agent_code():
    return "AG" + secrets.token_hex(3).upper()

def generate_voucher_code():
    return "WF" + secrets.token_hex(6).upper()

def generate_reference():
    return "TXN" + secrets.token_hex(8).upper()

def hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.encode()).hexdigest()

def verify_pin(pin: str, pin_hash: str) -> bool:
    return hash_pin(pin) == pin_hash

def create_jwt_token(payload: dict, secret: str, expires_minutes: int) -> str:
    import base64
    header = {"alg": "HS256", "typ": "JWT"}
    exp = datetime.utcnow() + timedelta(minutes=expires_minutes)
    payload["exp"] = exp.isoformat()
    
    header_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    
    message = f"{header_b64}.{payload_b64}"
    signature = hashlib.sha256(f"{message}{secret}".encode()).hexdigest()[:43]
    
    return f"{message}.{signature}"

def decode_jwt_token(token: str, secret: str):
    import base64
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        
        header_b64, payload_b64, signature = parts
        message = f"{header_b64}.{payload_b64}"
        expected_sig = hashlib.sha256(f"{message}{secret}".encode()).hexdigest()[:43]
        
        if signature != expected_sig:
            return None
        
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += "=" * padding
        
        payload = json.loads(base64.urlsafe_b64decode(payload_b64).decode())
        
        if "exp" in payload:
            exp = datetime.fromisoformat(payload["exp"])
            if datetime.utcnow() > exp:
                return None
        
        return payload
    except Exception:
        return None

def json_response(data, status=200):
    return Response(
        json.dumps(data),
        status=status,
        headers={"Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", "Access-Control-Allow-Headers": "*"}
    )

def error_response(message, status=400):
    return json_response({"detail": message}, status)

def get_attr(obj, key, default=None):
    """Safely get attribute from JsProxy object"""
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    val = getattr(obj, key, default)
    return val if val is not None else default

async def get_current_user(request, env):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    
    token = auth_header.split(" ")[1]
    secret = env.JWT_SECRET
    
    payload = decode_jwt_token(token, secret)
    if not payload:
        return None
    
    result = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(payload["sub"]).first()
    return result

class Default(WorkerEntrypoint):
    async def fetch(self, request):
        url = request.url
        path = "/" + url.split("/", 3)[-1].split("?")[0] if "/" in url else "/"
        method = request.method
        
        if method == "OPTIONS":
            return Response("", headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "*"
            })
        
        try:
            if path == "/" or path == "":
                return json_response({
                    "name": "Lokal Platform API",
                    "version": "1.0.0",
                    "description": "Digital wallet and services platform"
                })
            
            if path == "/healthz":
                return json_response({"status": "ok"})
            
            if path == "/auth/otp/request" and method == "POST":
                return await self.request_otp(request)
            
            if path == "/auth/otp/verify" and method == "POST":
                return await self.verify_otp(request)
            
            if path == "/auth/pin/login" and method == "POST":
                return await self.pin_login(request)
            
            if path == "/auth/pin/set" and method == "POST":
                return await self.set_pin(request)
            
            if path == "/auth/refresh" and method == "POST":
                return await self.refresh_tokens(request)
            
            if path == "/auth/logout" and method == "POST":
                return await self.logout(request)
            
            if path == "/users/me" and method == "GET":
                return await self.get_me(request)
            
            if path == "/users/me" and method == "PUT":
                return await self.update_me(request)
            
            if path == "/wallet/balance" and method == "GET":
                return await self.get_balance(request)
            
            if path == "/wallet/topup" and method == "POST":
                return await self.topup_wallet(request)
            
            if path == "/wallet/transactions" and method == "GET":
                return await self.get_transactions(request)
            
            if path == "/wifi/packages" and method == "GET":
                return await self.get_wifi_packages(request)
            
            if path == "/wifi/purchase" and method == "POST":
                return await self.purchase_wifi(request)
            
            if path == "/wifi/vouchers" and method == "GET":
                return await self.get_wifi_vouchers(request)
            
            if path == "/electricity/packages" and method == "GET":
                return await self.get_electricity_packages(request)
            
            if path == "/electricity/meters" and method == "GET":
                return await self.get_meters(request)
            
            if path == "/electricity/meters/register" and method == "POST":
                return await self.register_meter(request)
            
            if path == "/electricity/purchase" and method == "POST":
                return await self.purchase_electricity(request)
            
            if path == "/agent/register" and method == "POST":
                return await self.register_agent(request)
            
            if path == "/agent/dashboard" and method == "GET":
                return await self.agent_dashboard(request)
            
            if path == "/agent/float/topup" and method == "POST":
                return await self.topup_float(request)
            
            if path == "/agent/sale" and method == "POST":
                return await self.process_sale(request)
            
            if path == "/admin/dashboard" and method == "GET":
                return await self.admin_dashboard(request)
            
            if path == "/admin/users" and method == "GET":
                return await self.admin_get_users(request)
            
            if path == "/admin/agents" and method == "GET":
                return await self.admin_get_agents(request)
            
            return error_response("Not found", 404)
        except Exception as e:
            return error_response(str(e), 500)
    
    async def request_otp(self, request):
        body = await request.json()
        phone = body.get("phone_number")
        
        otp_code = generate_otp()
        otp_id = generate_uuid()
        expires_at = (datetime.utcnow() + timedelta(minutes=5)).isoformat()
        
        await self.env.DB.prepare(
            "UPDATE otp_codes SET used = 1 WHERE phone_number = ? AND used = 0"
        ).bind(phone).run()
        
        await self.env.DB.prepare(
            "INSERT INTO otp_codes (id, phone_number, code, expires_at) VALUES (?, ?, ?, ?)"
        ).bind(otp_id, phone, otp_code, expires_at).run()
        
        return json_response({
            "message": "OTP sent successfully",
            "expires_in": 300,
            "debug_otp": otp_code
        })
    
    async def verify_otp(self, request):
        body = await request.json()
        phone = body.get("phone_number")
        code = body.get("otp_code") or body.get("code")
        
        otp = await self.env.DB.prepare(
            "SELECT * FROM otp_codes WHERE phone_number = ? AND used = 0 AND expires_at > ? ORDER BY created_at DESC LIMIT 1"
        ).bind(phone, datetime.utcnow().isoformat()).first()
        
        if not otp:
            return error_response("Invalid or expired OTP", 400)
        
        if str(otp.code) != code:
            await self.env.DB.prepare(
                "UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?"
            ).bind(str(otp.id)).run()
            return error_response("Invalid OTP", 400)
        
        await self.env.DB.prepare("UPDATE otp_codes SET used = 1 WHERE id = ?").bind(str(otp.id)).run()
        
        user = await self.env.DB.prepare(
            "SELECT * FROM users WHERE phone_number = ?"
        ).bind(phone).first()
        
        is_new_user = False
        user_id = None
        if not user:
            is_new_user = True
            user_id = generate_uuid()
            referral_code = generate_referral_code()
            
            await self.env.DB.prepare(
                "INSERT INTO users (id, phone_number, referral_code) VALUES (?, ?, ?)"
            ).bind(user_id, phone, referral_code).run()
            
            wallet_id = generate_uuid()
            await self.env.DB.prepare(
                "INSERT INTO wallets (id, user_id) VALUES (?, ?)"
            ).bind(wallet_id, user_id).run()
        else:
            user_id = str(user.id)
        
        access_token = create_jwt_token({"sub": user_id, "type": "access"}, self.env.JWT_SECRET, 30)
        refresh_token = create_jwt_token({"sub": user_id, "type": "refresh"}, self.env.JWT_SECRET, 10080)
        
        refresh_id = generate_uuid()
        expires_at = (datetime.utcnow() + timedelta(days=7)).isoformat()
        await self.env.DB.prepare(
            "INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)"
        ).bind(refresh_id, user_id, refresh_token, expires_at).run()
        
        return json_response({
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": 1800,
            "user_id": user_id,
            "is_new_user": is_new_user
        })
    
    async def pin_login(self, request):
        body = await request.json()
        phone = body.get("phone_number")
        pin = body.get("pin")
        
        user = await self.env.DB.prepare(
            "SELECT * FROM users WHERE phone_number = ?"
        ).bind(phone).first()
        
        if not user or not user.pin_hash:
            return error_response("Invalid credentials", 401)
        
        if not verify_pin(pin, str(user.pin_hash)):
            return error_response("Invalid credentials", 401)
        
        user_id = str(user.id)
        access_token = create_jwt_token({"sub": user_id, "type": "access"}, self.env.JWT_SECRET, 30)
        refresh_token = create_jwt_token({"sub": user_id, "type": "refresh"}, self.env.JWT_SECRET, 10080)
        
        refresh_id = generate_uuid()
        expires_at = (datetime.utcnow() + timedelta(days=7)).isoformat()
        await self.env.DB.prepare(
            "INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)"
        ).bind(refresh_id, user_id, refresh_token, expires_at).run()
        
        return json_response({
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": 1800,
            "user_id": user_id,
            "is_new_user": False
        })
    
    async def set_pin(self, request):
        user = await get_current_user(request, self.env)
        if not user:
            return error_response("Not authenticated", 401)
        
        body = await request.json()
        pin = body.get("pin")
        confirm_pin = body.get("confirm_pin")
        
        if pin != confirm_pin:
            return error_response("PINs do not match", 400)
        
        pin_hash = hash_pin(pin)
        await self.env.DB.prepare(
            "UPDATE users SET pin_hash = ?, updated_at = ? WHERE id = ?"
        ).bind(pin_hash, datetime.utcnow().isoformat(), str(user.id)).run()
        
        return json_response({"message": "PIN set successfully"})
    
    async def refresh_tokens(self, request):
        body = await request.json()
        refresh_token = body.get("refresh_token")
        
        payload = decode_jwt_token(refresh_token, self.env.JWT_SECRET)
        if not payload or payload.get("type") != "refresh":
            return error_response("Invalid refresh token", 401)
        
        token_record = await self.env.DB.prepare(
            "SELECT * FROM refresh_tokens WHERE token = ? AND revoked = 0 AND expires_at > ?"
        ).bind(refresh_token, datetime.utcnow().isoformat()).first()
        
        if not token_record:
            return error_response("Invalid or expired refresh token", 401)
        
        await self.env.DB.prepare(
            "UPDATE refresh_tokens SET revoked = 1 WHERE id = ?"
        ).bind(str(token_record.id)).run()
        
        user = await self.env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(payload["sub"]).first()
        if not user:
            return error_response("User not found", 401)
        
        user_id = str(user.id)
        access_token = create_jwt_token({"sub": user_id, "type": "access"}, self.env.JWT_SECRET, 30)
        new_refresh_token = create_jwt_token({"sub": user_id, "type": "refresh"}, self.env.JWT_SECRET, 10080)
        
        refresh_id = generate_uuid()
        expires_at = (datetime.utcnow() + timedelta(days=7)).isoformat()
        await self.env.DB.prepare(
            "INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)"
        ).bind(refresh_id, user_id, new_refresh_token, expires_at).run()
        
        return json_response({
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
            "expires_in": 1800,
            "user_id": user_id,
            "is_new_user": False
        })
    
    async def logout(self, request):
        user = await get_current_user(request, self.env)
        if not user:
            return error_response("Not authenticated", 401)
        
        await self.env.DB.prepare(
            "UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ? AND revoked = 0"
        ).bind(str(user.id)).run()
        
        return json_response({"message": "Logged out successfully"})
    
    async def get_me(self, request):
        user = await get_current_user(request, self.env)
        if not user:
            return error_response("Not authenticated", 401)
        
        user_id = str(user.id)
        wallet = await self.env.DB.prepare(
            "SELECT * FROM wallets WHERE user_id = ?"
        ).bind(user_id).first()
        
        agent = await self.env.DB.prepare(
            "SELECT * FROM agents WHERE user_id = ?"
        ).bind(user_id).first()
        
        role = "USER"
        if agent:
            role = "AGENT"
        if str(user.phone_number) == "+27000000000":
            role = "ADMIN"
        
        return json_response({
            "id": user_id,
            "phone_number": str(user.phone_number),
            "first_name": str(user.first_name) if user.first_name else None,
            "last_name": str(user.last_name) if user.last_name else None,
            "email": str(user.email) if user.email else None,
            "kyc_status": str(user.kyc_status) if user.kyc_status else "PENDING",
            "status": str(user.status) if user.status else "ACTIVE",
            "referral_code": str(user.referral_code) if user.referral_code else None,
            "loyalty_points": int(user.loyalty_points) if user.loyalty_points else 0,
            "role": role,
            "wallet": {
                "id": str(wallet.id) if wallet else None,
                "balance": float(wallet.balance) if wallet else 0.0,
                "currency": str(wallet.currency) if wallet and wallet.currency else "ZAR"
            } if wallet else None,
            "agent": {
                "id": str(agent.id),
                "agent_code": str(agent.agent_code),
                "business_name": str(agent.business_name),
                "tier": str(agent.tier) if agent.tier else "BRONZE",
                "float_balance": float(agent.float_balance) if agent.float_balance else 0,
                "commission_balance": float(agent.commission_balance) if agent.commission_balance else 0
            } if agent else None
        })
    
    async def update_me(self, request):
        user = await get_current_user(request, self.env)
        if not user:
            return error_response("Not authenticated", 401)
        
        body = await request.json()
        first_name = body.get("first_name")
        last_name = body.get("last_name")
        email = body.get("email")
        
        await self.env.DB.prepare(
            "UPDATE users SET first_name = ?, last_name = ?, email = ?, updated_at = ? WHERE id = ?"
        ).bind(first_name, last_name, email, datetime.utcnow().isoformat(), str(user.id)).run()
        
        return json_response({"message": "Profile updated successfully"})
    
    async def get_balance(self, request):
        user = await get_current_user(request, self.env)
        if not user:
            return error_response("Not authenticated", 401)
        
        wallet = await self.env.DB.prepare(
            "SELECT * FROM wallets WHERE user_id = ?"
        ).bind(str(user.id)).first()
        
        if not wallet:
            return error_response("Wallet not found", 404)
        
        return json_response({
            "balance": float(wallet.balance),
            "currency": str(wallet.currency) if wallet.currency else "ZAR",
            "daily_limit": float(wallet.daily_limit) if wallet.daily_limit else 5000,
            "monthly_limit": float(wallet.monthly_limit) if wallet.monthly_limit else 50000,
            "daily_spent": float(wallet.daily_spent) if wallet.daily_spent else 0,
            "monthly_spent": float(wallet.monthly_spent) if wallet.monthly_spent else 0
        })
    
    async def topup_wallet(self, request):
        user = await get_current_user(request, self.env)
        if not user:
            return error_response("Not authenticated", 401)
        
        body = await request.json()
        amount = float(body.get("amount", 0))
        payment_method = body.get("payment_method", "CARD")
        
        wallet = await self.env.DB.prepare(
            "SELECT * FROM wallets WHERE user_id = ?"
        ).bind(str(user.id)).first()
        
        if not wallet:
            return error_response("Wallet not found", 404)
        
        wallet_id = str(wallet.id)
        balance_before = float(wallet.balance)
        balance_after = balance_before + amount
        
        await self.env.DB.prepare(
            "UPDATE wallets SET balance = ?, updated_at = ? WHERE id = ?"
        ).bind(balance_after, datetime.utcnow().isoformat(), wallet_id).run()
        
        txn_id = generate_uuid()
        reference = generate_reference()
        
        await self.env.DB.prepare(
            """INSERT INTO transactions 
            (id, wallet_id, type, amount, balance_before, balance_after, reference, status, payment_method, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"""
        ).bind(
            txn_id, wallet_id, "TOPUP", amount, balance_before, balance_after,
            reference, "COMPLETED", payment_method, f"Wallet topup via {payment_method}"
        ).run()
        
        return json_response({
            "message": "Topup successful",
            "reference": reference,
            "new_balance": balance_after
        })
    
    async def get_transactions(self, request):
        user = await get_current_user(request, self.env)
        if not user:
            return error_response("Not authenticated", 401)
        
        wallet = await self.env.DB.prepare(
            "SELECT * FROM wallets WHERE user_id = ?"
        ).bind(str(user.id)).first()
        
        if not wallet:
            return error_response("Wallet not found", 404)
        
        result = await self.env.DB.prepare(
            "SELECT * FROM transactions WHERE wallet_id = ? ORDER BY created_at DESC LIMIT 50"
        ).bind(str(wallet.id)).all()
        
        transactions = []
        results = result.results
        for i in range(results.length):
            txn = results[i]
            transactions.append({
                "id": str(txn.id),
                "type": str(txn.type),
                "amount": float(txn.amount),
                "balance_after": float(txn.balance_after),
                "reference": str(txn.reference),
                "status": str(txn.status),
                "description": str(txn.description) if txn.description else None,
                "created_at": str(txn.created_at)
            })
        
        return json_response({"transactions": transactions})
    
    async def get_wifi_packages(self, request):
        result = await self.env.DB.prepare(
            "SELECT * FROM wifi_packages WHERE is_active = 1 ORDER BY sort_order"
        ).all()
        
        packages = []
        results = result.results
        for i in range(results.length):
            pkg = results[i]
            packages.append({
                "id": str(pkg.id),
                "name": str(pkg.name),
                "description": str(pkg.description) if pkg.description else None,
                "price": float(pkg.price),
                "data_limit_mb": int(pkg.data_limit_mb),
                "validity_hours": int(pkg.validity_hours)
            })
        
        return json_response({"packages": packages})
    
    async def purchase_wifi(self, request):
        user = await get_current_user(request, self.env)
        if not user:
            return error_response("Not authenticated", 401)
        
        body = await request.json()
        package_id = body.get("package_id")
        
        package = await self.env.DB.prepare(
            "SELECT * FROM wifi_packages WHERE id = ? AND is_active = 1"
        ).bind(package_id).first()
        
        if not package:
            return error_response("Package not found", 404)
        
        user_id = str(user.id)
        wallet = await self.env.DB.prepare(
            "SELECT * FROM wallets WHERE user_id = ?"
        ).bind(user_id).first()
        
        if not wallet:
            return error_response("Wallet not found", 404)
        
        price = float(package.price)
        balance = float(wallet.balance)
        
        if balance < price:
            return error_response("Insufficient balance", 400)
        
        wallet_id = str(wallet.id)
        balance_after = balance - price
        await self.env.DB.prepare(
            "UPDATE wallets SET balance = ?, updated_at = ? WHERE id = ?"
        ).bind(balance_after, datetime.utcnow().isoformat(), wallet_id).run()
        
        voucher_id = generate_uuid()
        voucher_code = generate_voucher_code()
        txn_id = generate_uuid()
        reference = generate_reference()
        
        pkg_id = str(package.id)
        pkg_name = str(package.name)
        data_limit = int(package.data_limit_mb)
        validity = int(package.validity_hours)
        
        await self.env.DB.prepare(
            """INSERT INTO wifi_vouchers 
            (id, user_id, package_id, voucher_code, data_limit_mb, validity_hours, transaction_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)"""
        ).bind(
            voucher_id, user_id, pkg_id, voucher_code,
            data_limit, validity, txn_id
        ).run()
        
        await self.env.DB.prepare(
            """INSERT INTO transactions 
            (id, wallet_id, type, amount, balance_before, balance_after, reference, status, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"""
        ).bind(
            txn_id, wallet_id, "PURCHASE", price, balance, balance_after,
            reference, "COMPLETED", f"WiFi voucher: {pkg_name}"
        ).run()
        
        return json_response({
            "message": "Purchase successful",
            "voucher_code": voucher_code,
            "package_name": pkg_name,
            "data_limit_mb": data_limit,
            "validity_hours": validity,
            "reference": reference
        })
    
    async def get_wifi_vouchers(self, request):
        user = await get_current_user(request, self.env)
        if not user:
            return error_response("Not authenticated", 401)
        
        result = await self.env.DB.prepare(
            """SELECT v.*, p.name as package_name, p.price 
            FROM wifi_vouchers v 
            JOIN wifi_packages p ON v.package_id = p.id 
            WHERE v.user_id = ? 
            ORDER BY v.created_at DESC"""
        ).bind(str(user.id)).all()
        
        vouchers = []
        results = result.results
        for i in range(results.length):
            v = results[i]
            vouchers.append({
                "id": str(v.id),
                "voucher_code": str(v.voucher_code),
                "package_name": str(v.package_name),
                "status": str(v.status),
                "data_limit_mb": int(v.data_limit_mb),
                "data_used_mb": int(v.data_used_mb) if v.data_used_mb else 0,
                "validity_hours": int(v.validity_hours),
                "activated_at": str(v.activated_at) if v.activated_at else None,
                "expires_at": str(v.expires_at) if v.expires_at else None,
                "created_at": str(v.created_at)
            })
        
        return json_response({"vouchers": vouchers})
    
    async def get_electricity_packages(self, request):
        result = await self.env.DB.prepare(
            "SELECT * FROM electricity_packages WHERE is_active = 1 ORDER BY sort_order"
        ).all()
        
        packages = []
        results = result.results
        for i in range(results.length):
            pkg = results[i]
            packages.append({
                "id": str(pkg.id),
                "name": str(pkg.name),
                "description": str(pkg.description) if pkg.description else None,
                "price": float(pkg.price),
                "package_type": str(pkg.package_type),
                "kwh_amount": float(pkg.kwh_amount) if pkg.kwh_amount else None,
                "validity_days": int(pkg.validity_days) if pkg.validity_days else None
            })
        
        return json_response({"packages": packages})
    
    async def get_meters(self, request):
        user = await get_current_user(request, self.env)
        if not user:
            return error_response("Not authenticated", 401)
        
        result = await self.env.DB.prepare(
            "SELECT * FROM electricity_meters WHERE user_id = ?"
        ).bind(str(user.id)).all()
        
        meters = []
        results = result.results
        for i in range(results.length):
            m = results[i]
            meters.append({
                "id": str(m.id),
                "meter_number": str(m.meter_number),
                "address": str(m.address) if m.address else None,
                "kwh_balance": float(m.kwh_balance) if m.kwh_balance else 0,
                "status": str(m.status) if m.status else "ON",
                "unlimited_expires_at": str(m.unlimited_expires_at) if m.unlimited_expires_at else None
            })
        
        return json_response({"meters": meters})
    
    async def register_meter(self, request):
        user = await get_current_user(request, self.env)
        if not user:
            return error_response("Not authenticated", 401)
        
        body = await request.json()
        meter_number = body.get("meter_number")
        address = body.get("address")
        
        existing = await self.env.DB.prepare(
            "SELECT * FROM electricity_meters WHERE meter_number = ?"
        ).bind(meter_number).first()
        
        if existing:
            return error_response("Meter already registered", 400)
        
        meter_id = generate_uuid()
        await self.env.DB.prepare(
            "INSERT INTO electricity_meters (id, meter_number, user_id, address) VALUES (?, ?, ?, ?)"
        ).bind(meter_id, meter_number, str(user.id), address).run()
        
        return json_response({"message": "Meter registered successfully", "meter_id": meter_id})
    
    async def purchase_electricity(self, request):
        user = await get_current_user(request, self.env)
        if not user:
            return error_response("Not authenticated", 401)
        
        body = await request.json()
        package_id = body.get("package_id")
        meter_number = body.get("meter_number")
        
        package = await self.env.DB.prepare(
            "SELECT * FROM electricity_packages WHERE id = ? AND is_active = 1"
        ).bind(package_id).first()
        
        if not package:
            return error_response("Package not found", 404)
        
        user_id = str(user.id)
        meter = await self.env.DB.prepare(
            "SELECT * FROM electricity_meters WHERE meter_number = ? AND user_id = ?"
        ).bind(meter_number, user_id).first()
        
        if not meter:
            return error_response("Meter not found or not owned by user", 404)
        
        wallet = await self.env.DB.prepare(
            "SELECT * FROM wallets WHERE user_id = ?"
        ).bind(user_id).first()
        
        if not wallet:
            return error_response("Wallet not found", 404)
        
        price = float(package.price)
        balance = float(wallet.balance)
        pkg_name = str(package.name)
        pkg_type = str(package.package_type)
        
        if balance < price:
            return error_response("Insufficient balance", 400)
        
        wallet_id = str(wallet.id)
        meter_id = str(meter.id)
        balance_after = balance - price
        await self.env.DB.prepare(
            "UPDATE wallets SET balance = ?, updated_at = ? WHERE id = ?"
        ).bind(balance_after, datetime.utcnow().isoformat(), wallet_id).run()
        
        if pkg_type == "UNITS":
            kwh_balance = float(meter.kwh_balance) if meter.kwh_balance else 0
            kwh_amount = float(package.kwh_amount) if package.kwh_amount else 0
            new_kwh = kwh_balance + kwh_amount
            await self.env.DB.prepare(
                "UPDATE electricity_meters SET kwh_balance = ?, updated_at = ? WHERE id = ?"
            ).bind(new_kwh, datetime.utcnow().isoformat(), meter_id).run()
        else:
            validity_days = int(package.validity_days) if package.validity_days else 30
            expires_at = (datetime.utcnow() + timedelta(days=validity_days)).isoformat()
            await self.env.DB.prepare(
                "UPDATE electricity_meters SET unlimited_expires_at = ?, updated_at = ? WHERE id = ?"
            ).bind(expires_at, datetime.utcnow().isoformat(), meter_id).run()
        
        txn_id = generate_uuid()
        reference = generate_reference()
        
        await self.env.DB.prepare(
            """INSERT INTO transactions 
            (id, wallet_id, type, amount, balance_before, balance_after, reference, status, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"""
        ).bind(
            txn_id, wallet_id, "PURCHASE", price, balance, balance_after,
            reference, "COMPLETED", f"Electricity: {pkg_name} for meter {meter_number}"
        ).run()
        
        return json_response({
            "message": "Purchase successful",
            "package_name": pkg_name,
            "meter_number": meter_number,
            "reference": reference
        })
    
    async def register_agent(self, request):
        body = await request.json()
        phone = body.get("phone_number")
        otp_code = body.get("otp_code")
        business_name = body.get("business_name")
        business_type = body.get("business_type", "OTHER")
        address = body.get("address")
        
        otp = await self.env.DB.prepare(
            "SELECT * FROM otp_codes WHERE phone_number = ? AND code = ? AND used = 0 AND expires_at > ?"
        ).bind(phone, otp_code, datetime.utcnow().isoformat()).first()
        
        if not otp:
            return error_response("Invalid or expired OTP", 400)
        
        await self.env.DB.prepare("UPDATE otp_codes SET used = 1 WHERE id = ?").bind(str(otp.id)).run()
        
        user = await self.env.DB.prepare(
            "SELECT * FROM users WHERE phone_number = ?"
        ).bind(phone).first()
        
        user_id = None
        if not user:
            user_id = generate_uuid()
            referral_code = generate_referral_code()
            
            await self.env.DB.prepare(
                "INSERT INTO users (id, phone_number, referral_code) VALUES (?, ?, ?)"
            ).bind(user_id, phone, referral_code).run()
            
            wallet_id = generate_uuid()
            await self.env.DB.prepare(
                "INSERT INTO wallets (id, user_id) VALUES (?, ?)"
            ).bind(wallet_id, user_id).run()
        else:
            user_id = str(user.id)
        
        existing_agent = await self.env.DB.prepare(
            "SELECT * FROM agents WHERE user_id = ?"
        ).bind(user_id).first()
        
        if existing_agent:
            return error_response("User is already an agent", 400)
        
        agent_id = generate_uuid()
        agent_code = generate_agent_code()
        
        await self.env.DB.prepare(
            """INSERT INTO agents 
            (id, user_id, agent_code, business_name, business_type, address, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)"""
        ).bind(
            agent_id, user_id, agent_code, business_name,
            business_type, address, "ACTIVE"
        ).run()
        
        access_token = create_jwt_token({"sub": user_id, "type": "access"}, self.env.JWT_SECRET, 30)
        refresh_token = create_jwt_token({"sub": user_id, "type": "refresh"}, self.env.JWT_SECRET, 10080)
        
        return json_response({
            "message": "Agent registered successfully",
            "agent_code": agent_code,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user_id": user_id
        })
    
    async def agent_dashboard(self, request):
        user = await get_current_user(request, self.env)
        if not user:
            return error_response("Not authenticated", 401)
        
        agent = await self.env.DB.prepare(
            "SELECT * FROM agents WHERE user_id = ?"
        ).bind(str(user.id)).first()
        
        if not agent:
            return error_response("Not an agent", 403)
        
        return json_response({
            "agent_code": str(agent.agent_code),
            "business_name": str(agent.business_name),
            "tier": str(agent.tier) if agent.tier else "BRONZE",
            "float_balance": float(agent.float_balance) if agent.float_balance else 0,
            "commission_balance": float(agent.commission_balance) if agent.commission_balance else 0,
            "total_sales": float(agent.total_sales) if agent.total_sales else 0,
            "monthly_sales": float(agent.monthly_sales) if agent.monthly_sales else 0,
            "status": str(agent.status) if agent.status else "ACTIVE"
        })
    
    async def topup_float(self, request):
        user = await get_current_user(request, self.env)
        if not user:
            return error_response("Not authenticated", 401)
        
        body = await request.json()
        amount = float(body.get("amount", 0))
        
        agent = await self.env.DB.prepare(
            "SELECT * FROM agents WHERE user_id = ?"
        ).bind(str(user.id)).first()
        
        if not agent:
            return error_response("Not an agent", 403)
        
        float_balance = float(agent.float_balance) if agent.float_balance else 0
        new_balance = float_balance + amount
        
        await self.env.DB.prepare(
            "UPDATE agents SET float_balance = ?, updated_at = ? WHERE id = ?"
        ).bind(new_balance, datetime.utcnow().isoformat(), str(agent.id)).run()
        
        return json_response({
            "message": "Float topped up successfully",
            "new_balance": new_balance
        })
    
    async def process_sale(self, request):
        user = await get_current_user(request, self.env)
        if not user:
            return error_response("Not authenticated", 401)
        
        body = await request.json()
        customer_phone = body.get("customer_phone")
        product_type = body.get("product_type")
        package_id = body.get("package_id")
        meter_number = body.get("meter_number")
        
        agent = await self.env.DB.prepare(
            "SELECT * FROM agents WHERE user_id = ?"
        ).bind(str(user.id)).first()
        
        if not agent:
            return error_response("Not an agent", 403)
        
        if product_type == "WIFI":
            package = await self.env.DB.prepare(
                "SELECT * FROM wifi_packages WHERE id = ? AND is_active = 1"
            ).bind(package_id).first()
        else:
            package = await self.env.DB.prepare(
                "SELECT * FROM electricity_packages WHERE id = ? AND is_active = 1"
            ).bind(package_id).first()
        
        if not package:
            return error_response("Package not found", 404)
        
        price = float(package.price)
        pkg_name = str(package.name)
        pkg_id = str(package.id)
        float_balance = float(agent.float_balance) if agent.float_balance else 0
        
        if float_balance < price:
            return error_response("Insufficient float balance", 400)
        
        agent_tier = str(agent.tier) if agent.tier else "BRONZE"
        commission_rates = {"BRONZE": 0.05, "SILVER": 0.07, "GOLD": 0.10, "PLATINUM": 0.12}
        commission_rate = commission_rates.get(agent_tier, 0.05)
        commission = price * commission_rate
        
        new_float = float_balance - price
        new_commission = (float(agent.commission_balance) if agent.commission_balance else 0) + commission
        new_total_sales = (float(agent.total_sales) if agent.total_sales else 0) + price
        new_monthly_sales = (float(agent.monthly_sales) if agent.monthly_sales else 0) + price
        
        await self.env.DB.prepare(
            """UPDATE agents SET 
            float_balance = ?, commission_balance = ?, total_sales = ?, monthly_sales = ?, updated_at = ?
            WHERE id = ?"""
        ).bind(new_float, new_commission, new_total_sales, new_monthly_sales, datetime.utcnow().isoformat(), str(agent.id)).run()
        
        customer = await self.env.DB.prepare(
            "SELECT * FROM users WHERE phone_number = ?"
        ).bind(customer_phone).first()
        
        customer_id = None
        if not customer:
            customer_id = generate_uuid()
            referral_code = generate_referral_code()
            
            await self.env.DB.prepare(
                "INSERT INTO users (id, phone_number, referral_code) VALUES (?, ?, ?)"
            ).bind(customer_id, customer_phone, referral_code).run()
            
            wallet_id = generate_uuid()
            await self.env.DB.prepare(
                "INSERT INTO wallets (id, user_id) VALUES (?, ?)"
            ).bind(wallet_id, customer_id).run()
        else:
            customer_id = str(customer.id)
        
        reference = generate_reference()
        
        if product_type == "WIFI":
            voucher_id = generate_uuid()
            voucher_code = generate_voucher_code()
            data_limit = int(package.data_limit_mb)
            validity = int(package.validity_hours)
            
            await self.env.DB.prepare(
                """INSERT INTO wifi_vouchers 
                (id, user_id, package_id, voucher_code, data_limit_mb, validity_hours)
                VALUES (?, ?, ?, ?, ?, ?)"""
            ).bind(
                voucher_id, customer_id, pkg_id, voucher_code,
                data_limit, validity
            ).run()
            
            return json_response({
                "message": "Sale successful",
                "voucher_code": voucher_code,
                "package_name": pkg_name,
                "commission_earned": commission,
                "reference": reference
            })
        else:
            if not meter_number:
                return error_response("Meter number required for electricity", 400)
            
            meter = await self.env.DB.prepare(
                "SELECT * FROM electricity_meters WHERE meter_number = ?"
            ).bind(meter_number).first()
            
            meter_id = None
            meter_kwh_balance = 0
            if not meter:
                meter_id = generate_uuid()
                await self.env.DB.prepare(
                    "INSERT INTO electricity_meters (id, meter_number, user_id) VALUES (?, ?, ?)"
                ).bind(meter_id, meter_number, customer_id).run()
            else:
                meter_id = str(meter.id)
                meter_kwh_balance = float(meter.kwh_balance) if meter.kwh_balance else 0
            
            pkg_type = str(package.package_type)
            if pkg_type == "UNITS":
                kwh_amount = float(package.kwh_amount) if package.kwh_amount else 0
                new_kwh = meter_kwh_balance + kwh_amount
                await self.env.DB.prepare(
                    "UPDATE electricity_meters SET kwh_balance = ?, updated_at = ? WHERE id = ?"
                ).bind(new_kwh, datetime.utcnow().isoformat(), meter_id).run()
            else:
                validity_days = int(package.validity_days) if package.validity_days else 30
                expires_at = (datetime.utcnow() + timedelta(days=validity_days)).isoformat()
                await self.env.DB.prepare(
                    "UPDATE electricity_meters SET unlimited_expires_at = ?, updated_at = ? WHERE id = ?"
                ).bind(expires_at, datetime.utcnow().isoformat(), meter_id).run()
            
            return json_response({
                "message": "Sale successful",
                "package_name": pkg_name,
                "meter_number": meter_number,
                "commission_earned": commission,
                "reference": reference
            })
    
    async def admin_dashboard(self, request):
        user = await get_current_user(request, self.env)
        if not user:
            return error_response("Not authenticated", 401)
        
        phone = str(user.phone_number) if user.phone_number else ""
        if phone != "+27000000000":
            return error_response("Admin access required", 403)
        
        users_count = await self.env.DB.prepare("SELECT COUNT(*) as count FROM users").first()
        agents_count = await self.env.DB.prepare("SELECT COUNT(*) as count FROM agents").first()
        
        return json_response({
            "total_users": int(users_count.count) if users_count else 0,
            "total_agents": int(agents_count.count) if agents_count else 0,
            "total_transactions": 0,
            "total_revenue": 0
        })
    
    async def admin_get_users(self, request):
        user = await get_current_user(request, self.env)
        if not user:
            return error_response("Not authenticated", 401)
        
        phone = str(user.phone_number) if user.phone_number else ""
        if phone != "+27000000000":
            return error_response("Admin access required", 403)
        
        result = await self.env.DB.prepare(
            "SELECT * FROM users ORDER BY created_at DESC LIMIT 100"
        ).all()
        
        users = []
        results = result.results
        for i in range(results.length):
            u = results[i]
            users.append({
                "id": str(u.id),
                "phone_number": str(u.phone_number),
                "first_name": str(u.first_name) if u.first_name else None,
                "last_name": str(u.last_name) if u.last_name else None,
                "status": str(u.status) if u.status else "ACTIVE",
                "created_at": str(u.created_at)
            })
        
        return json_response({"users": users})
    
    async def admin_get_agents(self, request):
        user = await get_current_user(request, self.env)
        if not user:
            return error_response("Not authenticated", 401)
        
        phone = str(user.phone_number) if user.phone_number else ""
        if phone != "+27000000000":
            return error_response("Admin access required", 403)
        
        result = await self.env.DB.prepare(
            """SELECT a.*, u.phone_number 
            FROM agents a 
            JOIN users u ON a.user_id = u.id 
            ORDER BY a.created_at DESC"""
        ).all()
        
        agents = []
        results = result.results
        for i in range(results.length):
            a = results[i]
            agents.append({
                "id": str(a.id),
                "agent_code": str(a.agent_code),
                "business_name": str(a.business_name),
                "phone_number": str(a.phone_number),
                "tier": str(a.tier) if a.tier else "BRONZE",
                "status": str(a.status) if a.status else "PENDING",
                "total_sales": float(a.total_sales) if a.total_sales else 0,
                "created_at": str(a.created_at)
            })
        
        return json_response({"agents": agents})
