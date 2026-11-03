"""Builds the ASAS static UI kit: HTML pages + en/ar translation files.
Run: python3 build.py  (writes files next to this script)"""
import ast, json, os, re
D = os.path.dirname(os.path.abspath(__file__))
src = open('/home/claude/viz/gen.py').read()
ICON = ast.literal_eval(re.search(r"ICON = (\{.*?\n\})", src, re.S).group(1))
ICON.update({'shield': ICON['shield'], 'sun': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.3 17.7-1.4 1.4"/><path d="m19.1 4.9-1.4 1.4"/>', 'logout': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>', 'share': '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/>', 'refresh': '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>'})
LOGO = 'M26 282L26 196L72 196L72 329L62 340L62 205L36 206L36 242L57 242L57 251L36 252L35 359L268 359L268 32L276 23L278 23L278 369L26 369ZM81 310L81 280L82 280L91 286L91 331L118 331L118 282L81 256L81 196L128 196L128 253L126 252L118 246L118 205L91 205L91 251L128 277L128 341L81 341ZM207 340L206 340L206 280L207 280L216 287L216 331L243 331L243 282L206 256L206 196L253 196L253 253L243 245L242 206L216 206L216 251L252 277L253 341L207 341ZM151 268L151 196L197 196L197 339L188 331L188 206L161 205L161 242L182 242L182 251L161 251L161 330L151 340ZM26 132L26 78L34 67L35 176L70 176L70 77L79 66L79 176L94 176L94 75L104 66L104 176L118 176L118 76L128 66L128 186L26 186ZM151 104L151 23L152 23L161 35L161 176L193 176L193 78L202 66L203 176L217 176L217 76L227 66L227 176L242 176L242 76L252 66L252 186L151 186ZM269 18L269 10L277 3L277 7L271 12L271 18L272 18L278 13L278 16L268 25Z'
SPRITE = '<svg width="0" height="0" style="position:absolute" aria-hidden="true">' + ''.join(f'<symbol id="i-{k}" viewBox="0 0 24 24">{v}</symbol>' for k, v in ICON.items()) + f'<symbol id="i-logo" viewBox="26 3 252 366"><path fill-rule="evenodd" d="{LOGO}"/></symbol></svg>'

EN, AR = {}, {}
def T(key, en, ar, tag='span', attrs=''):
    """Translatable text. Registers key and returns markup with data-i18n."""
    if not en and key in EN: en, ar = EN[key], AR[key]
    if key in EN and EN[key] != en: raise ValueError('key clash ' + key)
    EN[key], AR[key] = en, ar
    return f'<{tag} data-i18n="{key}"{(" " + attrs) if attrs else ""}>{en}</{tag}>'
def K(key, en, ar):
    EN[key], AR[key] = en, ar
    return key
def ic(n, cls=''):
    return f'<svg class="icon {cls}" aria-hidden="true"><use href="#i-{n}"/></svg>'

# ---- Shared vocabulary ----
NAV = [('grid', 'overview', 'Overview', 'لوحة التحكم', 'overview.html'),
       ('users', 'users', 'Users & Access', 'المستخدمون والصلاحيات', 'users.html'),
       ('brief', 'hr', 'HR', 'الموارد البشرية', 'employees.html'),
       ('report', 'reports', 'Project reports', 'تقارير المشاريع', 'report-new.html'),
       ('ruler', 'offers', 'Dimensions & Offers', 'المقاسات والعروض', 'offer-new.html'),
       ('folder', 'documents', 'Documents', 'المستندات', 'documents.html'),
       ('wallet', 'accounting', 'Accounting', 'المحاسبة', 'accounting.html'),
       ('card', 'payroll', 'Payroll', 'الرواتب', 'salary-run.html'),
       ('mail', 'email', 'Email', 'البريد', 'overview.html')]
ROLE = {
    'SA': ('Abdullah S.', 'role.superAdmin', 'Super Admin', 'مدير النظام', 'AS', [n[1] for n in NAV]),
    'HR': ('Layla Hassan', 'role.hr', 'HR Officer', 'مسؤولة الموارد البشرية', 'LH', ['overview', 'hr', 'documents']),
    'ENG': ('Mohammed Rahman', 'role.engineer', 'Site Engineer', 'مهندس موقع', 'MR', ['overview', 'reports', 'offers', 'documents']),
    'ACC': ('Aisha Karim', 'role.accountant', 'Accountant', 'محاسبة', 'AK', ['overview', 'accounting', 'payroll', 'documents']),
    'ST': ('Omar Farouk', 'role.staff', 'Staff', 'موظف', 'OF', ['overview']),
}
for _n in NAV: EN['nav.'+_n[1]], AR['nav.'+_n[1]] = _n[2], _n[3]
for _r in ROLE.values(): EN[_r[1]], AR[_r[1]] = _r[2], _r[3]
EN['date.today'], AR['date.today'] = 'Monday 2 November 2026', 'الاثنين ٢ نوفمبر ٢٠٢٦'
HOME = {'SA': 'overview.html', 'HR': 'employees.html', 'ENG': 'report-new.html', 'ACC': 'accounting.html', 'ST': 'staff.html'}

def sidebar(active, role):
    name, rk, ren, rar, ini, allowed = ROLE[role]
    items = ''
    for i, k, en, ar, href in NAV:
        if k not in allowed: continue
        if k == 'overview': href = HOME[role]
        cur = ' aria-current="page"' if k == active else ''
        items += f'<a class="nav-item" href="{href}"{cur}>{ic(i)}{T("nav." + k, en, ar)}</a>'
    return f'''<aside class="sidebar" id="sidebar" aria-label="Main">
  <div class="brand"><svg aria-hidden="true"><use href="#i-logo"/></svg><div><b>ASAS</b><small>EXECUTION</small></div></div>
  {T("nav.workspace", "Workspace", "مساحة العمل", "div", 'class="nav-label"')}
  <nav>{items}</nav>
  {T("nav.assist", "Assist", "المساعدة", "div", 'class="nav-label"')}
  <a class="nav-item" href="#" data-open="ai">{ic("spark")}{T("nav.ai", "AI Assistant", "المساعد الذكي")}</a>
  <a class="nav-item" href="settings.html"{' aria-current="page"' if active == 'settings' else ''}>{ic("shield")}{T("nav.settings", "Settings", "الإعدادات")}</a>
  <div class="spacer"></div>
  <div class="me"><span class="avatar">{ini}</span><div class="grow"><b>{name}</b><small>{T(rk, ren, rar)}</small></div><a href="index.html" class="icon-btn" style="background:transparent;border:0;color:var(--steel)" data-i18n-aria="nav.signOut" aria-label="Sign out">{ic("logout", "icon--flip")}</a></div>
</aside>'''
K('nav.signOut', 'Sign out', 'تسجيل الخروج')

def topbar(tk, ten, tar):
    return f'''<header class="topbar">
  <button class="menu-btn" data-menu data-i18n-aria="top.menu" aria-label="Open menu">{ic("menu", "icon--lg")}</button>
  <h1>{T(tk, ten, tar)}</h1>
  <label class="search">{ic("search", "icon--sm")}<input type="search" data-i18n-ph="top.search" placeholder="Search people, projects, offers…"></label>
  <div class="lang" role="group" aria-label="Language"><button data-lang="en" aria-pressed="true">EN</button><button data-lang="ar" aria-pressed="false">ع</button></div>
  <button class="icon-btn" data-theme-toggle data-i18n-aria="top.theme" aria-label="Switch theme">{ic("moon")}</button>
  <button class="icon-btn icon-btn--ai" data-open="ai" data-i18n-aria="top.ai" aria-label="Open AI assistant">{ic("spark")}</button>
  <button class="icon-btn" data-i18n-aria="top.notifications" aria-label="Notifications">{ic("bell")}<span class="dot"></span></button>
</header>'''
K('top.menu', 'Open menu', 'فتح القائمة'); K('top.search', 'Search people, projects, offers…', 'ابحث عن موظف أو مشروع أو عرض…')
K('top.theme', 'Switch theme', 'تغيير المظهر'); K('top.ai', 'Open AI assistant', 'فتح المساعد الذكي'); K('top.notifications', 'Notifications', 'الإشعارات')

def ai_drawer():
    return f'''<aside class="drawer drawer--dark" id="ai" role="dialog" aria-modal="true" aria-labelledby="ai-title">
  <div class="between"><div class="hstack" style="color:var(--champagne)">{ic("spark", "icon--lg")}<h2 id="ai-title" style="font-size:18px;color:#F2F2F2">{T("ai.title", "ASAS Assistant", "مساعد أساس")}</h2></div><button class="close" data-close style="background:#262627;color:var(--steel)" data-i18n-aria="common.close" aria-label="Close">{ic("x", "icon--sm")}</button></div>
  <div style="align-self:flex-end;max-width:80%;background:var(--champagne);color:var(--onyx);padding:12px 14px;border-radius:16px 16px 4px 16px">{T("ai.q1", "Summarise today’s emails and what needs me.", "لخّص بريد اليوم وما يحتاج إلى قراري.")}</div>
  <div style="max-width:90%;background:#262627;padding:12px 14px;border-radius:16px 16px 16px 4px;color:var(--mist)">{T("ai.a1", "9 new emails. 3 need you: Al-Mannai Villa asks for a revised offer, invoice INV-882 waits for approval, and the Lusail permit renewal is due in 14 days.", "٩ رسائل جديدة، ٣ منها تحتاجك: فيلا المناعي تطلب عرضاً معدّلاً، والفاتورة INV-882 بانتظار الموافقة، وتجديد تصريح لوسيل مستحق خلال ١٤ يوماً.")}</div>
  <div class="hstack">{''.join(f'<button class="chip" style="background:transparent;border-color:#3A3A3B;color:var(--silver)">{T(k, e, a)}</button>' for k, e, a in [("ai.s1", "Draft replies", "صياغة الردود"), ("ai.s2", "Approve INV-882", "اعتماد INV-882"), ("ai.s3", "Remind me at 4 pm", "ذكّرني الساعة ٤ مساءً")])}</div>
  <div style="margin-top:auto" class="stack stack--sm"><label class="search" style="width:100%;height:52px;background:#262627;border-color:#333334">{ic("spark", "icon--sm")}<input data-i18n-ph="ai.ask" placeholder="Ask about any page, report or email…"></label>{T("ai.note", "AI drafts. You approve before anything is sent.", "الذكاء الاصطناعي يقترح، وأنت تعتمد قبل أي إرسال.", "small", 'style="color:var(--steel);text-align:center"')}</div>
</aside>'''
K('ai.ask', 'Ask about any page, report or email…', 'اسأل عن أي صفحة أو تقرير أو رسالة…')
K('common.close', 'Close', 'إغلاق')

def page(file, title_key, title_en, title_ar, body, role=None, active=None, top=None, extra=''):
    shell = body
    if role:
        shell = f'<div class="app">{sidebar(active, role)}<div class="main">{topbar(*top)}<main class="content" id="main">{body}</main></div></div>{ai_drawer()}'
    html = f'''<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title data-i18n="{title_key}">{title_en} · ASAS System</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;600;700&family=Noto+Sans+Arabic:wght@400;600&family=IBM+Plex+Mono&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/asas.css">
<script>try{{var l=localStorage.getItem('asas-lang'),t=localStorage.getItem('asas-theme');if(l==='ar'){{document.documentElement.lang='ar';document.documentElement.dir='rtl';}}if(t)document.documentElement.dataset.theme=t;}}catch(e){{}}</script>
</head>
<body>
{SPRITE}
{shell}
<div class="overlay" data-overlay></div>
{extra}
<script src="assets/js/i18n.js"></script>
<script src="assets/js/app.js"></script>
</body>
</html>'''
    EN[title_key] = title_en + ' · ASAS System'; AR[title_key] = title_ar + ' · نظام أساس'
    open(os.path.join(D, file), 'w').write(html)

def kpi(k, label, ar_label, value, note_k=None, note_en='', note_ar='', tone='', dark=False):
    n = f'<span class="note {("note--" + tone) if tone else ""}">{T(note_k, note_en, note_ar)}</span>' if note_k else ''
    return f'<div class="card kpi{" card--dark" if dark else ""}">{T(k, label, ar_label, "span", "class=\"label\"")}<span class="value num">{value}</span>{n}</div>'

def hdr(ek, een, ear, tk, ten, tar, sk=None, sen='', sar='', actions=''):
    sub = T(sk, sen, sar, 'p', 'class="page-sub"') if sk else ''
    eb = T(ek, een, ear, 'span', 'class="eyebrow"') if ek else ''
    return f'<div class="page-header"><div>{eb}{T(tk, ten, tar, "h2", "class=\"page-title\"")}{sub}</div><div class="hstack">{actions}</div></div>'

def btn(kind, k, en, ar, icon=None, attrs='', size=''):
    return f'<button class="btn btn--{kind}{(" btn--" + size) if size else ""}" {attrs}>{ic(icon) if icon else ""}{T(k, en, ar)}</button>'

def badge(tone, k, en, ar):
    return f'<span class="badge badge--{tone}">{T(k, en, ar)}</span>'

# Common words
K('st.verified', 'Verified', 'موثّق'); K('st.pending', 'Pending', 'قيد الانتظار'); K('st.present', 'Present', 'حاضر')
K('btn.cancel', 'Cancel', 'إلغاء'); K('btn.approve', 'Approve', 'موافقة'); K('btn.decline', 'Decline', 'رفض'); K('btn.export', 'Export', 'تصدير'); K('btn.saveDraft', 'Save draft', 'حفظ كمسودة')
def W(key):  # reuse already-registered word
    return f'<span data-i18n="{key}">{EN[key]}</span>'

# =================================================================== PAGES
# ---------- Sign in ----------
def auth_brand(nk, nen, nar):
    return f'''<section class="auth-brand"><div></div><div><svg class="logo" aria-hidden="true" viewBox="26 3 252 366"><use href="#i-logo"/></svg><div class="logo-word">EXECUTION</div></div>
<div class="bottom">{T("auth.private", "Private system", "نظام خاص", "span", 'class="eyebrow"')}{T(nk, nen, nar, "p", 'style="margin-top:8px"')}</div></section>'''
lang_auth = '<div class="lang" role="group" aria-label="Language"><button data-lang="en" aria-pressed="true">EN</button><button data-lang="ar" aria-pressed="false">ع</button></div>'
roles = ''.join(f'<a class="chip" href="{h}">{T(k, e, a)}</a>' for k, e, a, h in [('demo.sa', 'Super Admin', 'مدير النظام', 'overview.html'), ('demo.hr', 'HR', 'الموارد البشرية', 'employees.html'), ('demo.eng', 'Engineer', 'مهندس', 'report-new.html'), ('demo.acc', 'Accountant', 'محاسب', 'accounting.html'), ('demo.st', 'Staff', 'موظف', 'staff.html')])
page('index.html', 'title.signIn', 'Sign in', 'تسجيل الدخول', f'''<div class="auth">{auth_brand("auth.note", "For ASAS team members only. Every sign-in is recorded.", "للعاملين في أساس فقط. يتم تسجيل كل عملية دخول.")}
<section class="auth-form">{lang_auth}<form class="inner" action="overview.html">
  <div>{T("auth.welcome", "Welcome back", "مرحباً بعودتك", "h2")}{T("auth.signInSub", "Sign in to the ASAS system", "سجّل الدخول إلى نظام أساس", "p", 'class="muted"')}</div>
  <div class="field"><label for="email">{T("auth.email", "Work email", "البريد الإلكتروني للعمل")}</label><input class="input" id="email" type="email" value="a.salah@asasqa.com" autocomplete="username"></div>
  <div class="field"><label for="pw">{T("auth.password", "Password", "كلمة المرور")}</label><input class="input" id="pw" type="password" value="password123" autocomplete="current-password"></div>
  <div class="between"><label class="check"><input type="checkbox" checked>{T("auth.keep", "Keep me signed in", "تذكّرني")}</label><a class="link" href="#">{T("auth.forgot", "Forgot password?", "نسيت كلمة المرور؟")}</a></div>
  <button class="btn btn--primary btn--lg btn--block" type="submit">{T("auth.signIn", "Sign in", "تسجيل الدخول")}</button>
  <p class="muted" style="text-align:center">{T("auth.new", "New to ASAS?", "جديد في أساس؟")} <a class="link" href="register.html">{T("auth.create", "Create an account", "إنشاء حساب")}</a></p>
  <div class="demo-roles">{T("demo.title", "Prototype · sign in as", "نموذج تجريبي · الدخول بصفة", "span", 'class="eyebrow" style="color:var(--text-2)"')}<div class="hstack">{roles}</div></div>
</form></section></div>''')

# ---------- Register ----------
page('register.html', 'title.register', 'Create account', 'إنشاء حساب', f'''<div class="auth">{auth_brand("auth.note2", "Your role and modules are confirmed by Super Admin before access.", "يؤكد مدير النظام دورك والوحدات المتاحة لك قبل منح الصلاحية.")}
<section class="auth-form">{lang_auth}<form class="inner" action="staff.html">
  <a class="back" href="index.html">{ic("chevl", "icon--sm icon--flip")}{T("auth.back", "Back to sign in", "العودة لتسجيل الدخول")}</a>
  <div>{T("reg.title", "Create your account", "أنشئ حسابك", "h2", 'style="font-size:34px"')}{T("reg.sub", "New accounts start with basic access.", "تبدأ الحسابات الجديدة بصلاحيات أساسية.", "p", 'class="muted"')}</div>
  <div class="form-grid form-grid--2"><div class="field"><label>{T("reg.name", "Full name", "الاسم الكامل")}</label><input class="input" value="Omar Farouk"></div><div class="field"><label>{T("reg.empId", "Employee ID", "الرقم الوظيفي")}</label><input class="input num" value="ASAS-0115"></div></div>
  <div class="field"><label>{W("auth.email")}</label><input class="input" type="email" value="o.farouk@asasqa.com"></div>
  <div class="field"><label>{T("reg.mobile", "Mobile", "الجوال")}</label><input class="input num" value="+974 5512 3344"></div>
  <div class="form-grid form-grid--2"><div class="field"><label>{W("auth.password")}</label><input class="input" type="password" value="12345678"></div><div class="field"><label>{T("reg.confirm", "Confirm password", "تأكيد كلمة المرور")}</label><input class="input" type="password" value="12345678"></div></div>
  <label class="check"><input type="checkbox" checked>{T("reg.agree", "I agree to the ASAS system rules", "أوافق على قواعد استخدام نظام أساس")}</label>
  <button class="btn btn--primary btn--lg btn--block" type="submit">{T("reg.submit", "Create account", "إنشاء الحساب")}</button>
  <div class="ai">{ic("shield")}<span>{T("reg.note", "After sign-in, request your role. Super Admin confirms it.", "بعد الدخول، اطلب دورك الوظيفي وسيؤكده مدير النظام.")}</span></div>
</form></section></div>''')

# ---------- Staff basic dashboard + request access ----------
modal_req = f'''<div class="modal" id="request" role="dialog" aria-modal="true" aria-labelledby="req-title">
  <div class="between"><h2 id="req-title" style="font-size:22px">{T("req.title", "Request access", "طلب صلاحية")}</h2><button class="close" data-close aria-label="Close" data-i18n-aria="common.close">{ic("x", "icon--sm")}</button></div>
  {T("req.sub", "Choose the dashboard you need. Super Admin checks your ID and photo before approving.", "اختر لوحة التحكم التي تحتاجها. سيتحقق مدير النظام من هويتك وصورتك قبل الموافقة.", "p", 'class="muted"')}
  <div class="field"><label>{W("reg.empId")}</label><input class="input num" value="ASAS-0115"></div>
  <div class="field"><span class="label">{T("req.dash", "Dashboard", "لوحة التحكم")}</span><div class="hstack" data-group>{''.join(f'<button class="chip" aria-pressed="{str(i == 1).lower()}">{W(k)}</button>' for i, k in enumerate(["demo.hr", "demo.eng", "demo.acc", "demo.st"]))}</div></div>
  <div class="field"><label>{T("req.msg", "Message to Super Admin", "رسالة إلى مدير النظام")}</label><textarea class="textarea">I joined the projects team on 28 Oct and report to Mohammed Rahman.</textarea></div>
  <div class="hstack" style="justify-content:flex-end">{btn("ghost", "btn.cancel", EN["btn.cancel"], AR["btn.cancel"], attrs="data-close")}{btn("accent", "req.send", "Send request", "إرسال الطلب", "send", 'data-close data-toast="sent" data-swap="pending"')}</div>
</div>
<div class="toast" id="sent" role="status"><span class="tick">{ic("check", "icon--sm")}</span><div><b>{T("req.sentT", "Request sent", "تم إرسال الطلب")}</b><small>{T("req.sentS", "Super Admin has been notified", "تم إشعار مدير النظام")}</small></div></div>'''
staff = f'''{hdr("role.staff", "Staff", "موظف", "staff.hello", "Good morning, Omar", "صباح الخير يا عمر", "date.today", "Monday 2 November 2026", "الاثنين ٢ نوفمبر ٢٠٢٦")}
<div class="banner" id="basic"><span class="circle">{ic("shield", "icon--lg")}</span><div class="grow"><b>{T("staff.basicT", "You have basic access", "لديك صلاحيات أساسية")}</b>{T("staff.basicS", "Request the dashboard for your job. Super Admin confirms who you are, then opens it.", "اطلب لوحة التحكم الخاصة بعملك. يتحقق مدير النظام من هويتك ثم يفعّلها لك.", "p")}</div>{btn("accent", "req.title", EN["req.title"], AR["req.title"], "send", 'data-open="request"')}</div>
<div class="card" id="pending" hidden style="display:flex;align-items:center;gap:18px;border-color:var(--ai-border)"><span class="banner circle" style="background:var(--accent-soft);color:var(--accent-text);width:48px;height:48px;border-radius:50%;display:grid;place-items:center;padding:0">{ic("clock", "icon--lg")}</span><div class="grow"><b>{T("staff.pendT", "Request sent · Engineer dashboard", "تم إرسال الطلب · لوحة المهندس")}</b>{T("staff.pendS", "Super Admin will confirm your role. You will get an email when it is approved.", "سيؤكد مدير النظام دورك، وستصلك رسالة عند الموافقة.", "p", 'class="muted"')}</div>{badge("warn", "staff.waiting", "Waiting for approval", "بانتظار الموافقة")}</div>
<div class="grid-3">
  <div class="card stack stack--sm">{T("staff.profile", "My profile", "ملفي", "h3", 'class="card-title"')}<div class="person"><span class="avatar avatar--lg">OF</span><div><b>Omar Farouk</b><small>{T("staff.pos", "Foreman · Site team", "مراقب عمال · فريق الموقع")} · <span class="num">ASAS-0115</span></small></div></div></div>
  <div class="card kpi">{T("staff.leave", "Leave balance", "رصيد الإجازات", "span", 'class="label"')}<span class="value"><span class="num">18</span> {T("unit.days", "days", "يوماً")}</span>{T("staff.leaveN", "Annual leave left in 2026", "المتبقي من الإجازة السنوية لعام ٢٠٢٦", "span", 'class="note"')}</div>
  <div class="card kpi">{T("staff.att", "Attendance · November", "الحضور · نوفمبر", "span", 'class="label"')}<span class="value num">2 / 2</span>{T("staff.attN", "Checked in 07:02 today", "سجّلت الحضور ٠٧:٠٢ اليوم", "span", 'class="note note--ok"')}</div>
</div>
<div class="card">{T("staff.news", "Company announcements", "إعلانات الشركة", "h3", 'class="card-title"')}
  {''.join(f'<div class="list-row"><span class="badge badge--accent badge--plain">{ic("bell", "icon--sm")}</span><div class="grow">{T(k + "t", t, ta, "b")}{T(k + "s", s, sa, "small")}</div></div>' for k, t, ta, s, sa in [("ann1.", "Safety briefing at Lusail site", "إحاطة السلامة في موقع لوسيل", "Wed 4 Nov · 07:00 · all site staff", "الأربعاء ٤ نوفمبر · ٧:٠٠ · جميع موظفي الموقع"), ("ann2.", "National Day holiday", "عطلة اليوم الوطني", "Fri 18 Dec · offices closed", "الجمعة ١٨ ديسمبر · المكاتب مغلقة")])}
</div>'''
page('staff.html', 'title.staff', 'Overview', 'لوحة التحكم', staff, 'ST', 'overview', ('page.overview', 'Overview', 'لوحة التحكم'), modal_req)

# ---------- Super Admin overview ----------
days = [('d.tue', 'Tue', 'الثلاثاء', 5), ('d.wed', 'Wed', 'الأربعاء', 6), ('d.thu', 'Thu', 'الخميس', 5), ('d.fri', 'Fri', 'الجمعة', 1), ('d.sat', 'Sat', 'السبت', 2), ('d.sun', 'Sun', 'الأحد', 5), ('d.today', 'Today', 'اليوم', 5)]
bars = ''.join(f'<div class="bar{" bar--now" if i == 6 else " bar--weekend" if i in (3, 4) else ""}"><span class="num">{v}</span><i style="height:{v * 26}px"></i>{T(k, e, a)}</div>' for i, (k, e, a, v) in enumerate(days))
reqs = ''.join(f'<div class="list-row"><span class="avatar">{ini}</span><div class="grow"><b>{n}</b>{T(k, e, a, "small")}</div><button class="btn btn--secondary btn--sm" data-open="access">{T("btn.review", "Review", "مراجعة")}</button></div>' for ini, n, k, e, a in [('YH', 'Yousef Haddad', 'req.eng', 'Asks for Engineer dashboard', 'يطلب لوحة المهندس'), ('FN', 'Fatima Noor', 'req.hr', 'Asks for HR dashboard', 'تطلب لوحة الموارد البشرية'), ('KM', 'Khalid Mansour', 'req.acc', 'Asks for Accounting', 'يطلب المحاسبة')])
act = ''.join(f'<div class="list-row"><span class="tile-icon">{ic(i, "icon--sm")}</span><div class="grow">{T(k, e, a)}</div><small class="muted">{T(k + "t", t, ta)}</small></div>' for i, k, e, a, t, ta in [('report', 'act1', 'Mohammed Rahman submitted the Lusail villa daily report', 'أرسل محمد رحمن التقرير اليومي لفيلا لوسيل', '10 min ago', 'قبل ١٠ دقائق'), ('wallet', 'act2', 'Aisha Karim recorded QAR 85,000 from Al-Mannai Villa', 'سجّلت عائشة كريم ٨٥٬٠٠٠ ريال من فيلا المناعي', '42 min ago', 'قبل ٤٢ دقيقة'), ('ruler', 'act3', 'Offer OF-2026-124 sent to Al-Mannai Villa', 'أُرسل العرض OF-2026-124 إلى فيلا المناعي', '1 h ago', 'قبل ساعة')])
access_drawer = f'''<aside class="drawer" id="access" role="dialog" aria-modal="true" aria-labelledby="acc-title">
  <div class="between"><h2 id="acc-title" style="font-size:20px">{T("acc.title", "Access request", "طلب صلاحية")}</h2><button class="close" data-close aria-label="Close" data-i18n-aria="common.close">{ic("x", "icon--sm")}</button></div>
  <div class="person"><span class="avatar avatar--lg" style="background:var(--steel);color:#fff">FN</span><div><b style="font-size:18px">Fatima Noor</b><small class="num">ASAS-0187 · f.noor@asasqa.com</small></div></div>
  <div class="card" style="background:var(--surface-2);border:0">{T("acc.asks", "Asks for", "يطلب", "small", 'class="muted"')}<b style="display:block">{T("acc.hrDash", "HR dashboard", "لوحة الموارد البشرية")}</b><p class="muted" style="margin-top:4px">“I joined HR on 28 Oct and report to Layla Hassan.”</p></div>
  <div class="field"><label>{T("acc.role", "Assign role", "تحديد الدور")}</label><select class="select"><option>HR Officer</option><option>Staff</option></select></div>
  <div class="field"><span class="label">{T("acc.modules", "Modules", "الوحدات")}</span>
  {''.join(f'<div class="between" style="padding:4px 0">{W(k) if k in EN else T(k, e, a)}<label class="switch"><input type="checkbox" {"checked" if on else ""}><span></span></label></div>' for k, e, a, on in [("mod.employees", "Employees", "الموظفون", 1), ("mod.attendance", "Attendance & leave", "الحضور والإجازات", 1), ("mod.careers", "Careers", "التوظيف", 1), ("nav.documents", "", "", 1), ("nav.accounting", "", "", 0), ("nav.payroll", "", "", 0)])}</div>
  <label class="check"><input type="checkbox" checked>{T("acc.confirm", "I confirmed this person works at ASAS", "تأكدت أن هذا الشخص يعمل في أساس")}</label>
  <div class="drawer-footer">{btn("ghost", "btn.decline", EN["btn.decline"], AR["btn.decline"], attrs="data-close")}{btn("primary", "acc.approve", "Approve access", "اعتماد الصلاحية", "check", 'data-close data-toast="approved"')}</div>
</aside>
<div class="toast" id="approved" role="status"><span class="tick">{ic("check", "icon--sm")}</span><div><b>{T("acc.done", "Access approved", "تم اعتماد الصلاحية")}</b><small>{T("acc.doneS", "Fatima Noor can now open the HR dashboard", "يمكن لفاطمة نور الآن فتح لوحة الموارد البشرية")}</small></div></div>'''
overview = f'''{hdr("role.superAdmin", "", "", "ov.hello", "Good afternoon, Abdullah", "مساء الخير يا عبدالله", "date.today", "", "", btn("secondary", "btn.export", EN["btn.export"], AR["btn.export"], "download") + btn("primary", "ov.newUser", "New user", "مستخدم جديد", "plus", 'onclick="location.href=\'users.html\'"'))}
<div class="grid-4">{kpi("ov.k1", "Access requests", "طلبات الوصول", "6", "ov.k1n", "● 2 waiting over 24 h", "● طلبان منذ أكثر من ٢٤ ساعة", "warn")}{kpi("ov.k2", "Active users", "المستخدمون النشطون", "48", "ov.k2n", "across 6 roles", "في ٦ أدوار")}{kpi("ov.k3", "Site reports this week", "تقارير الموقع هذا الأسبوع", "10", "ov.k3n", "● All 5 projects reported today", "● أُرسلت تقارير المشاريع الخمسة اليوم", "ok")}{kpi("ov.k4", "Offers awaiting client", "عروض بانتظار العميل", "4", "ov.k4n", "QAR 612,400 in total", "إجمالي ٦١٢٬٤٠٠ ريال", dark=True)}</div>
<div class="split"><div class="stack">
  <div class="card"><div class="between"><div>{T("ov.chart", "Daily site reports", "تقارير الموقع اليومية", "h3", 'class="card-title"')}{T("ov.chartS", "Reports submitted per day · last 7 days · 5 projects", "عدد التقارير يومياً · آخر ٧ أيام · ٥ مشاريع", "p", 'class="card-sub"')}</div><select class="select select--sm" style="width:auto"><option>This week</option></select></div><div class="bars">{bars}</div></div>
  <div class="card">{T("ov.activity", "Recent activity", "آخر النشاطات", "h3", 'class="card-title"')}{act}</div>
</div><div class="stack">
  <div class="card"><div class="between">{T("ov.req", "Access requests", "طلبات الوصول", "h3", 'class="card-title"')}<a class="link" href="users.html">{T("common.viewAll", "View all", "عرض الكل")}</a></div>{reqs}</div>
  <div class="ai">{ic("spark")}<div><b>{T("ov.aiT", "AI summary · 9 new emails", "ملخص الذكاء الاصطناعي · ٩ رسائل جديدة")}</b>{T("ov.aiS", "Al-Mannai Villa asks for the revised offer. Gulf Marble invoice INV-882 waits for approval. Lusail permit renewal is due in 14 days.", "تطلب فيلا المناعي العرض المعدّل. فاتورة جلف ماربل INV-882 بانتظار الموافقة. تجديد تصريح لوسيل مستحق خلال ١٤ يوماً.")}</div></div>
</div></div>'''
EN['role.superAdmin'] = 'Super Admin'; AR['role.superAdmin'] = 'مدير النظام'
EN['date.today'] = 'Monday 2 November 2026'; AR['date.today'] = 'الاثنين ٢ نوفمبر ٢٠٢٦'
overview = overview.replace('data-i18n="role.superAdmin"></span>', 'data-i18n="role.superAdmin">Super Admin</span>').replace('data-i18n="date.today"></p>', 'data-i18n="date.today">Monday 2 November 2026</p>')
page('overview.html', 'title.overview', 'Overview', 'لوحة التحكم', overview, 'SA', 'overview', ('page.overview', 'Overview', 'لوحة التحكم'), access_drawer)

# ---------- Users & Access ----------
U = [('MR', 'Mohammed Rahman', 'ASAS-0142', 'Engineer', 'Projects', 'ok', 'st.verified', 'Today, 09:12', 0), ('FN', 'Fatima Noor', 'ASAS-0187', 'Staff', 'People', 'warn', 'st.reqHR', '—', 1), ('YH', 'Yousef Haddad', 'ASAS-0191', 'Staff', 'Projects', 'warn', 'st.reqEng', '—', 1), ('AK', 'Aisha Karim', 'ASAS-0108', 'Accountant', 'Finance', 'ok', 'st.verified', 'Today, 08:40', 0), ('RS', 'Reem Saleh', 'ASAS-0131', 'Senior Accountant', 'Finance', 'ok', 'st.verified', 'Today, 08:15', 0), ('LH', 'Layla Hassan', 'ASAS-0120', 'HR', 'People', 'ok', 'st.verified', 'Yesterday', 0), ('OF', 'Omar Farouk', 'ASAS-0115', 'Staff', 'Site team', 'ok', 'st.verified', 'Yesterday', 0)]
K('st.reqHR', 'Requests HR', 'يطلب الموارد البشرية'); K('st.reqEng', 'Requests Engineer', 'يطلب صلاحية مهندس')
K('col.name', 'Name', 'الاسم'); K('col.role', 'Role', 'الدور'); K('col.dept', 'Department', 'القسم'); K('col.status', 'Status', 'الحالة'); K('col.last', 'Last active', 'آخر نشاط')
rows = ''.join(f'''<tr{' class="is-selected"' if s else ''}><td data-label=""><div class="person"><input type="checkbox" {"checked" if s else ""} aria-label="Select"><span class="avatar">{a}</span><div><b>{n}</b><small class="num">{i}</small></div></div></td>
<td data-label="{EN['col.role']}" data-i18n-label="col.role"><select class="select select--sm" style="width:160px"><option>{r}</option></select></td><td data-label="{EN['col.dept']}" data-i18n-label="col.dept">{dp}</td><td data-label="{EN['col.status']}" data-i18n-label="col.status"><span class="badge badge--{t}" data-i18n="{sk}">{EN[sk]}</span></td><td data-label="{EN['col.last']}" data-i18n-label="col.last" class="muted">{la}</td>
<td class="end" data-label="">{'<button class="btn btn--secondary btn--sm" data-open="access" data-i18n="btn.reviewReq">Review request</button>' if sk != 'st.verified' else '<button class="icon-btn" style="border:0;background:transparent" aria-label="More">' + ic("more") + '</button>'}</td></tr>''' for a, n, i, r, dp, t, sk, la, s in U)
K('btn.reviewReq', 'Review request', 'مراجعة الطلب')
utabs = lambda on: '<div class="tabs" role="tablist">' + ''.join(f'<a class="tab" href="{h}" role="tab" aria-selected="{str(k == on).lower()}">{T(k, e, a)}</a>' for k, e, a, h in [('ut.users', 'Users', 'المستخدمون', 'users.html'), ('ut.req', 'Access requests', 'طلبات الوصول', 'users.html'), ('ut.roles', 'Roles & permissions', 'الأدوار والصلاحيات', 'users.html#roles'), ('ut.bank', 'Bank accounts', 'الحسابات البنكية', 'users.html#bank')]) + '</div>'
users = f'''{hdr("role.superAdmin", "Super Admin", "مدير النظام", "nav.users", "Users & Access", "المستخدمون والصلاحيات", "us.sub", "48 users · 6 roles", "٤٨ مستخدماً · ٦ أدوار", btn("secondary", "btn.export", EN["btn.export"], AR["btn.export"], "download") + btn("primary", "us.invite", "Invite user", "دعوة مستخدم", "plus"))}
{utabs('ut.users')}
<div class="hstack"><label class="search" style="width:320px">{ic("search", "icon--sm")}<input data-i18n-ph="us.search" placeholder="Search name, ID or email"></label><select class="select" style="width:160px"><option data-i18n="us.allRoles">All roles</option></select><select class="select" style="width:180px"><option data-i18n="us.allDepts">All departments</option></select></div>
<div class="bulk"><label class="check"><input type="checkbox" checked>{T("us.selected", "2 selected", "تم تحديد ٢")}</label><span class="sep"></span><button data-open="access">{ic("check", "icon--sm")}{W("btn.approve")}</button><button>{ic("users", "icon--sm")}{T("us.changeRole", "Change role", "تغيير الدور")}</button><button>{ic("lock", "icon--sm")}{T("us.disable", "Disable", "تعطيل")}</button><button class="clear">{T("us.clear", "Clear selection", "إلغاء التحديد")}</button></div>
<div class="card card--flush table-wrap"><table class="table table--cards"><thead><tr><th data-i18n="col.name">Name</th><th data-i18n="col.role">Role</th><th data-i18n="col.dept">Department</th><th data-i18n="col.status">Status</th><th data-i18n="col.last">Last active</th><th></th></tr></thead><tbody>{rows}</tbody></table></div>'''
K('us.search', 'Search name, ID or email', 'ابحث بالاسم أو الرقم أو البريد'); K('us.allRoles', 'All roles', 'كل الأدوار'); K('us.allDepts', 'All departments', 'كل الأقسام')
page('users.html', 'title.users', 'Users & Access', 'المستخدمون والصلاحيات', users, 'SA', 'users', ('nav.users', 'Users & Access', 'المستخدمون والصلاحيات'), access_drawer)

# ---------- HR employees ----------
E = [('MR', 'Mohammed Rahman', 'ASAS-0142', 'Site Engineer', 'Projects', '+974 5501 2210', 'ok', 'st.present', 'Mar 2021'), ('YH', 'Yousef Haddad', 'ASAS-0191', 'Planning Engineer', 'Projects', '+974 5534 8871', 'danger', 'st.late', 'Oct 2026'), ('LH', 'Layla Hassan', 'ASAS-0120', 'HR Officer', 'People', '+974 5590 1123', 'ok', 'st.present', 'Mar 2022'), ('AK', 'Aisha Karim', 'ASAS-0108', 'Accountant', 'Finance', '+974 5521 7781', 'ok', 'st.present', 'Jun 2020'), ('OF', 'Omar Farouk', 'ASAS-0115', 'Foreman', 'Site team', '+974 5512 3344', 'ok', 'st.present', 'Jan 2024'), ('NA', 'Nasser Ali', 'ASAS-0150', 'Carpenter', 'Site team', '+974 5578 2201', 'warn', 'st.annual', 'Aug 2023'), ('SK', 'Sameer Khan', 'ASAS-0163', 'Painter', 'Site team', '+974 5566 4410', 'warn', 'st.sick', 'May 2024')]
K('st.late', 'Late · 09:40', 'متأخر · ٠٩:٤٠'); K('st.annual', 'Annual leave', 'إجازة سنوية'); K('st.sick', 'Sick leave', 'إجازة مرضية')
K('col.employee', 'Employee', 'الموظف'); K('col.position', 'Position', 'المسمى الوظيفي'); K('col.mobile', 'Mobile', 'الجوال'); K('col.today', 'Today', 'اليوم'); K('col.joined', 'Joined', 'تاريخ الالتحاق')
erows = ''.join(f'<tr><td data-label=""><div class="person"><span class="avatar">{a}</span><div><b>{n}</b><small class="num">{i}</small></div></div></td><td data-label="{EN["col.position"]}" data-i18n-label="col.position">{p}</td><td data-label="{EN["col.dept"]}" data-i18n-label="col.dept" class="muted">{d}</td><td data-label="{EN["col.mobile"]}" data-i18n-label="col.mobile" class="num muted">{m}</td><td data-label="{EN["col.today"]}" data-i18n-label="col.today"><span class="badge badge--{t}" data-i18n="{sk}">{EN[sk]}</span></td><td data-label="{EN["col.joined"]}" data-i18n-label="col.joined" class="muted">{j}</td></tr>' for a, n, i, p, d, m, t, sk, j in E)
emp = f'''{hdr("hr.eyebrow", "Human resources", "الموارد البشرية", "hr.title", "Employees", "الموظفون", "hr.sub", "48 employees · 6 departments", "٤٨ موظفاً · ٦ أقسام", btn("secondary", "btn.export", EN["btn.export"], AR["btn.export"], "download") + btn("primary", "hr.add", "Add employee", "إضافة موظف", "plus"))}
<div class="tabs">{''.join(f'<a class="tab" href="#" aria-selected="{str(i == 0).lower()}">{T(k, e, a)}</a>' for i, (k, e, a) in enumerate([("hr.t1", "Employees", "الموظفون"), ("hr.t2", "Attendance & leave", "الحضور والإجازات"), ("hr.t3", "Careers", "التوظيف"), ("hr.t4", "HR documents", "مستندات الموارد البشرية")]))}</div>
<div class="grid-4">{kpi("hr.k1", "Employees", "الموظفون", "48", "hr.k1n", "6 departments", "٦ أقسام")}{kpi("hr.k2", "Present today", "الحاضرون اليوم", "44", "hr.k2n", "● checked in by 07:30", "● سجّلوا قبل ٠٧:٣٠", "ok")}{kpi("hr.k3", "On leave", "في إجازة", "3", "hr.k3n", "1 annual · 2 sick", "١ سنوية · ٢ مرضية")}{kpi("hr.k4", "Late today", "متأخرون اليوم", "1", "hr.k4n", "Yousef Haddad · 09:40", "يوسف حداد · ٠٩:٤٠", "danger")}</div>
<div class="ai">{ic("send")}<div class="grow"><b>{T("hr.reportT", "October attendance report is ready", "تقرير حضور أكتوبر جاهز")}</b>{T("hr.reportS", "Send it to Accounting for the salary run.", "أرسله إلى المحاسبة لإعداد الرواتب.")}</div>{btn("accent", "hr.send", "Send to Accounting", "إرسال إلى المحاسبة", "send", 'data-toast="hrsent"', "sm")}</div>
<div class="card card--flush table-wrap"><table class="table table--cards"><thead><tr><th data-i18n="col.employee">Employee</th><th data-i18n="col.position">Position</th><th data-i18n="col.dept">Department</th><th data-i18n="col.mobile">Mobile</th><th data-i18n="col.today">Today</th><th data-i18n="col.joined">Joined</th></tr></thead><tbody>{erows}</tbody></table></div>'''
page('employees.html', 'title.employees', 'Employees', 'الموظفون', emp, 'HR', 'hr', ('nav.hr', 'HR', 'الموارد البشرية'), f'<div class="toast" id="hrsent" role="status"><span class="tick">{ic("check", "icon--sm")}</span><div><b>{T("hr.sentT", "Report sent to Accounting", "تم إرسال التقرير إلى المحاسبة")}</b><small>{T("hr.sentS", "Aisha Karim will prepare October salaries", "ستُعد عائشة كريم رواتب أكتوبر")}</small></div></div>')

# ---------- Engineer daily report ----------
svc = ''.join(f'<button class="chip" aria-pressed="{str(i == 1).lower()}">{T(k, e, a)}</button>' for i, (k, e, a) in enumerate([('svc.construction', 'Construction', 'الإنشاءات'), ('svc.finishing', 'Finishing', 'التشطيبات'), ('svc.interior', 'Interior design', 'التصميم الداخلي'), ('svc.furniture', 'Furniture', 'الأثاث'), ('svc.plans', 'Architectural plans', 'المخططات المعمارية')]))
items = [('Majlis', 'Gypsum ceiling', '100%', 'ok', 'wi.complete'), ('Dining', 'Gypsum ceiling', '100%', 'ok', 'wi.complete'), ('Bedrooms level 1', 'Paint — primer', '40%', 'info', 'wi.progress'), ('Bedrooms level 1', 'Porcelain flooring', '0%', 'warn', 'wi.waiting')]
K('wi.complete', 'Complete', 'مكتمل'); K('wi.progress', 'In progress', 'قيد التنفيذ'); K('wi.waiting', 'Waiting material', 'بانتظار المواد')
K('col.area', 'Area', 'المنطقة'); K('col.work', 'Work', 'العمل'); K('col.done', 'Done today', 'المنجز اليوم')
irows = ''.join(f'<tr><td data-label="{EN["col.area"]}" data-i18n-label="col.area" class="strong">{a}</td><td data-label="{EN["col.work"]}" data-i18n-label="col.work">{w}</td><td data-label="{EN["col.done"]}" data-i18n-label="col.done" class="num">{d}</td><td data-label="{EN["col.status"]}" data-i18n-label="col.status"><span class="badge badge--{t}" data-i18n="{k}">{EN[k]}</span></td></tr>' for a, w, d, t, k in items)
rep = f'''<a class="back" href="#">{ic("chevl", "icon--sm icon--flip")}{T("rep.back", "Reports", "التقارير")}</a>
<div class="split split--wide"><div class="card stack">
  <div class="between">{T("rep.title", "Daily site report", "تقرير الموقع اليومي", "h2", 'class="card-title" style="font-size:18px"')}<button class="chip chip--ai">{ic("spark", "icon--sm")}{T("rep.ai", "Write with AI from my notes", "اكتب بالذكاء الاصطناعي من ملاحظاتي")}</button></div>
  <div class="form-grid"><div class="field"><label>{T("rep.project", "Project", "المشروع")}</label><select class="select"><option>Villa interior — Lusail</option></select></div><div class="field"><label>{T("rep.date", "Date", "التاريخ")}</label><input class="input" type="date" value="2026-11-02"></div><div class="field"><label>{T("rep.weather", "Weather", "الطقس")}</label><select class="select"><option>Clear · 31°C</option></select></div></div>
  <div class="field"><span class="label">{T("rep.service", "Service", "الخدمة")}</span><div class="hstack" data-group>{svc}</div></div>
  <div class="card card--flush table-wrap"><table class="table table--cards"><thead><tr><th data-i18n="col.area">Area</th><th data-i18n="col.work">Work</th><th data-i18n="col.done">Done today</th><th data-i18n="col.status">Status</th></tr></thead><tbody>{irows}</tbody></table></div>
  <div class="form-grid"><div class="field"><label>{T("rep.workers", "Workers on site", "العمال في الموقع")}</label><input class="input num" value="14"></div><div class="field"><label>{T("rep.subs", "Subcontractors", "المقاولون من الباطن")}</label><input class="input" value="Doha Gypsum Co. · 6"></div><div class="field"><label>{T("rep.progress", "Overall progress", "نسبة الإنجاز الكلية")}</label><input class="input num" value="65%"></div></div>
  <div class="field"><label>{T("rep.issues", "Issues and notes", "الملاحظات والمشكلات")}</label><textarea class="textarea">Marble for bedrooms delayed by supplier to Wednesday. Porcelain flooring starts after delivery.</textarea></div>
</div><div class="stack">
  <div class="card stack stack--sm"><div class="between">{T("rep.photos", "Site photos", "صور الموقع", "h3", 'class="card-title"')}<small class="muted num">3 / 10</small></div><div class="grid-2"><div class="photo"></div><div class="photo" style="background:var(--steel)"></div><div class="photo" style="background:var(--mist)"></div><label class="dropzone">{ic("camera")}{T("rep.add", "Add photos", "إضافة صور")}<input type="file" accept="image/*" capture="environment" hidden></label></div></div>
  <div class="ai">{ic("spark")}<div><b>{T("rep.checkT", "AI check", "تدقيق الذكاء الاصطناعي")}</b>{T("rep.checkS", "Progress went from 62% to 65%. The flooring delay will appear in the weekly report to the client.", "ارتفع الإنجاز من ٦٢٪ إلى ٦٥٪. سيظهر تأخير الأرضيات في التقرير الأسبوعي للعميل.")}</div></div>
  {btn("primary", "rep.submit", "Submit report", "إرسال التقرير", "send", 'data-toast="repsent"', "lg")}{btn("secondary", "btn.saveDraft", EN["btn.saveDraft"], AR["btn.saveDraft"])}
</div></div>'''
page('report-new.html', 'title.report', 'Daily site report', 'تقرير الموقع اليومي', rep, 'ENG', 'reports', ('nav.reports', 'Project reports', 'تقارير المشاريع'), f'<div class="toast" id="repsent" role="status"><span class="tick">{ic("check", "icon--sm")}</span><div><b>{T("rep.sentT", "Report submitted", "تم إرسال التقرير")}</b><small>{T("rep.sentS", "It will be part of this week’s AI report", "سيُضمَّن في التقرير الأسبوعي")}</small></div></div>')

# ---------- New offer ----------
Ms = [('Majlis', 'Painting', '6.20', '4.80', '3.20', 70.4, 'm²', 28), ('Majlis', 'Gypsum ceiling', '6.20', '4.80', '—', 29.8, 'm²', 95), ('Dining', 'Painting', '5.10', '4.20', '3.20', 59.5, 'm²', 28), ('Bedroom 1', 'Porcelain flooring', '4.60', '4.00', '—', 18.4, 'm²', 165), ('Bedroom 1', 'Painting', '4.60', '4.00', '3.00', 51.6, 'm²', 28), ('Corridor', 'Porcelain flooring', '7.80', '1.60', '—', 12.5, 'm²', 165), ('Kitchen', 'Cabinets — supply & fit', '4.20', '—', '—', 4.2, 'lm', 2400)]
tot = sum(m[5] * m[7] for m in Ms)
f0 = lambda x: f'{round(x):,}'
K('col.room', 'Room', 'الغرفة'); K('col.qty', 'Qty', 'الكمية'); K('col.unit', 'Unit', 'الوحدة'); K('col.rate', 'Rate QAR', 'السعر بالريال'); K('col.total', 'Total QAR', 'الإجمالي بالريال')
mrows = ''.join(f'<tr><td data-label="{EN["col.room"]}" data-i18n-label="col.room" class="strong">{a}</td><td data-label="{EN["col.work"]}" data-i18n-label="col.work">{b}</td><td data-label="L" class="num">{c}</td><td data-label="W" class="num">{d}</td><td data-label="H" class="num">{e}</td><td data-label="{EN["col.qty"]}" data-i18n-label="col.qty" class="num strong">{q}</td><td data-label="{EN["col.unit"]}" data-i18n-label="col.unit" class="muted">{u}</td><td data-label="{EN["col.rate"]}" data-i18n-label="col.rate" class="num">{f0(r)}</td><td data-label="{EN["col.total"]}" data-i18n-label="col.total" class="num end strong">{f0(q * r)}</td></tr>' for a, b, c, d, e, q, u, r in Ms)
step = lambda cls, n, k, e, a: f'<div class="step {cls}"><span class="n">{n}</span>{T(k, e, a, "b")}</div>'
offer = f'''<a class="back" href="#">{ic("chevl", "icon--sm icon--flip")}{T("off.back", "Offers", "العروض")}</a>
<div class="page-header"><div>{T("off.title", "New offer", "عرض جديد", "h2", 'class="page-title"')} <span class="page-title num" style="font-size:22px">· OF-2026-126</span><p class="page-sub">Al-Mannai Villa · Villa interior — Lusail</p></div>
<div class="steps">{step("", ic("check", "icon--sm"), "off.s1", "Client", "العميل")}<span class="step-line"></span>{step("step--current", "2", "off.s2", "Measurements", "المقاسات")}<span class="step-line"></span>{step("step--todo", "3", "off.s3", "Pricing", "التسعير")}<span class="step-line"></span>{step("step--todo", "4", "off.s4", "Offer", "العرض")}</div></div>
<div class="split split--wide"><div class="stack stack--sm">
  <div class="hstack" data-group>{''.join(f'<button class="chip" aria-pressed="{str(i == 0).lower()}">{T(k, e, a)}</button>' for i, (k, e, a) in enumerate([("off.all", "All rooms", "كل الغرف"), ("off.paint", "Painting", "الدهان"), ("off.gyp", "Gypsum", "الجبس"), ("off.floor", "Flooring", "الأرضيات"), ("off.kitchen", "Kitchen", "المطبخ")]))}</div>
  <div class="card card--flush table-wrap"><table class="table table--cards"><thead><tr><th data-i18n="col.room">Room</th><th data-i18n="col.work">Work</th><th>L m</th><th>W m</th><th>H m</th><th data-i18n="col.qty">Qty</th><th data-i18n="col.unit">Unit</th><th data-i18n="col.rate">Rate QAR</th><th class="end" data-i18n="col.total">Total QAR</th></tr></thead><tbody>{mrows}</tbody></table>
  <div style="padding:12px 16px;border-top:1px solid var(--border)"><a class="link" href="#">{ic("plus", "icon--sm")}{T("off.addM", "Add measurement", "إضافة مقاس")}</a></div></div>
  <div class="ai">{ic("spark")}<span>{T("off.ai", "Rates come from the 2026 price list. Bedroom 1 painting area matches a 3.00 m ceiling.", "الأسعار من قائمة أسعار ٢٠٢٦. مساحة دهان غرفة النوم ١ تطابق ارتفاع سقف ٣٫٠٠ م.")}</span></div>
</div><div class="card stack stack--sm">{T("off.summary", "Offer summary", "ملخص العرض", "h3", 'class="card-title"')}
  <div class="kv">{T("off.client", "Client", "العميل")}<span>Al-Mannai Villa</span></div><div class="kv">{T("off.items", "Items", "البنود")}<span class="num">7</span></div>
  <div class="kv">{T("off.subtotal", "Subtotal", "المجموع الفرعي")}<span class="num">QAR {f0(tot)}</span></div><div class="kv">{T("off.discount", "Discount 5%", "خصم ٥٪")}<span class="num">− QAR {f0(tot * .05)}</span></div>
  <div class="total">{T("off.total", "Total", "الإجمالي", "b")}<strong class="num">QAR {f0(tot * .95)}</strong></div>
  {T("off.valid", "Valid for 30 days · prices exclude furniture", "صالح لمدة ٣٠ يوماً · الأسعار لا تشمل الأثاث", "small", 'class="muted"')}
  {btn("primary", "off.preview", "Preview on letterhead", "معاينة على الورق الرسمي", "eye", "", "block")}{btn("secondary", "btn.saveDraft", EN["btn.saveDraft"], AR["btn.saveDraft"], attrs='style="width:100%"')}
</div></div>'''
page('offer-new.html', 'title.offer', 'New offer', 'عرض جديد', offer, 'SA', 'offers', ('nav.offers', 'Dimensions & Offers', 'المقاسات والعروض'))

# ---------- Documents ----------
Dc = [('Villa contract — Al Waab', 'dt.contract', 'Majlis renovation', 'v3', 'ok', 'ds.signed', '28 Oct'), ('Building permit — plot 41', 'dt.permit', 'Villa interior — Lusail', 'v1', 'warn', 'ds.expires', '21 Oct'), ('Shop drawings rev. C', 'dt.drawing', 'Office fit-out — West Bay', 'v3', 'info', 'ds.review', '19 Oct'), ('Marble supplier agreement', 'dt.contract', 'All projects', 'v2', 'ok', 'ds.signed', '15 Oct'), ('Handover certificate', 'dt.cert', 'Apartment — Tower 3', 'v1', 'neutral', 'ds.draft', '12 Oct'), ('Insurance policy 2026', 'dt.policy', 'Company', 'v1', 'danger', 'ds.expired', '2 Oct')]
for k, e, a in [('dt.contract', 'Contract', 'عقد'), ('dt.permit', 'Permit', 'تصريح'), ('dt.drawing', 'Drawing', 'مخطط'), ('dt.cert', 'Certificate', 'شهادة'), ('dt.policy', 'Policy', 'وثيقة'), ('ds.signed', 'Signed', 'موقّع'), ('ds.expires', 'Expires 16 Nov', 'ينتهي ١٦ نوفمبر'), ('ds.review', 'In review', 'قيد المراجعة'), ('ds.draft', 'Draft', 'مسودة'), ('ds.expired', 'Expired', 'منتهي'), ('col.type', 'Type', 'النوع'), ('col.project', 'Project', 'المشروع'), ('col.ver', 'Ver.', 'الإصدار'), ('col.updated', 'Updated', 'آخر تحديث')]: K(k, e, a)
drows = ''.join(f'<tr data-open="doc" style="cursor:pointer"><td data-label=""><div class="person"><span class="tile-icon">{ic("report", "icon--sm")}</span><b>{n}</b></div></td><td data-label="{EN["col.type"]}" data-i18n-label="col.type"><span class="badge badge--accent badge--plain" data-i18n="{t}">{EN[t]}</span></td><td data-label="{EN["col.project"]}" data-i18n-label="col.project" class="muted">{p}</td><td data-label="{EN["col.ver"]}" data-i18n-label="col.ver" class="num muted">{v}</td><td data-label="{EN["col.status"]}" data-i18n-label="col.status"><span class="badge badge--{tone}" data-i18n="{s}">{EN[s]}</span></td><td data-label="{EN["col.updated"]}" data-i18n-label="col.updated" class="muted">{u}</td></tr>' for n, t, p, v, tone, s, u in Dc)
doc_drawer = f'''<aside class="drawer" id="doc" role="dialog" aria-modal="true" aria-labelledby="doc-title">
  <div class="between"><h2 id="doc-title" style="font-size:19px">Building permit — plot 41</h2><button class="close" data-close aria-label="Close" data-i18n-aria="common.close">{ic("x", "icon--sm")}</button></div>
  <div class="hstack"><span class="badge badge--accent badge--plain" data-i18n="dt.permit">Permit</span><span class="badge badge--warn" data-i18n="ds.expires">Expires 16 Nov</span></div>
  <div class="dropzone" style="min-height:220px">{ic("report", "icon--lg")}<b>Permit-plot41-Lusail.pdf</b><small class="num">PDF · 3 · 1.8 MB</small></div>
  <div><div class="kv">{T("doc.project", "Project", "المشروع")}<span>Villa interior — Lusail</span></div><div class="kv">{T("doc.issued", "Issued by", "الجهة المصدرة")}<span>Lusail Municipality</span></div><div class="kv">{T("doc.owner", "Owner", "المسؤول")}<span>Mohammed Rahman</span></div></div>
  {T("doc.sent", "Sent log", "سجل الإرسال", "h3", 'class="card-title"')}<div class="list-row">{ic("send", "icon--sm")}<div class="grow"><b>Ali Khalil Haji</b><small>{T("doc.sent1", "Technical manager · 22 Oct", "المدير الفني · ٢٢ أكتوبر")}</small></div></div>
  <div class="drawer-footer">{btn("secondary", "doc.download", "Download", "تنزيل", "download")}{btn("primary", "doc.newVer", "New version", "إصدار جديد", "upload")}</div>
</aside>'''
flt = ''.join(f'<a class="nav-item" style="color:var(--text);{"background:var(--surface);font-weight:600" if i == 0 else ""}" href="#">{T(k, e, a, "span", "class=\"grow\"")}<small class="muted num">{c}</small></a>' for i, (k, e, a, c) in enumerate([('doc.f1', 'All documents', 'كل المستندات', '214'), ('doc.f2', 'Shared with me', 'مشاركة معي', '38'), ('doc.f3', 'Expiring soon', 'تنتهي قريباً', '4'), ('doc.f4', 'Contracts', 'العقود', '46'), ('doc.f5', 'Drawings', 'المخططات', '71'), ('doc.f6', 'Permits', 'التصاريح', '18')]))
docs = f'''{hdr("doc.eyebrow", "Document control", "إدارة المستندات", "nav.documents", "Documents", "المستندات", "doc.sub", "214 documents · 4 expiring in 30 days", "٢١٤ مستنداً · ٤ تنتهي خلال ٣٠ يوماً", btn("primary", "doc.upload", "Upload document", "رفع مستند", "upload"))}
<div class="row"><nav style="width:220px;flex:none" class="stack stack--sm" aria-label="Filters">{flt}</nav><div class="stack grow">
<label class="search" style="width:min(320px,100%)">{ic("search", "icon--sm")}<input data-i18n-ph="doc.search" placeholder="Search documents"></label>
<div class="card card--flush table-wrap"><table class="table table--cards"><thead><tr><th data-i18n="col.name">Name</th><th data-i18n="col.type">Type</th><th data-i18n="col.project">Project</th><th data-i18n="col.ver">Ver.</th><th data-i18n="col.status">Status</th><th data-i18n="col.updated">Updated</th></tr></thead><tbody>{drows}</tbody></table></div>
<div class="ai">{ic("clock")}<span>{T("doc.alert", "Building permit for plot 41 expires in 14 days. HR and the site engineer were notified.", "ينتهي تصريح البناء للقطعة ٤١ خلال ١٤ يوماً، وتم إشعار الموارد البشرية ومهندس الموقع.")}</span></div></div></div>'''
K('doc.search', 'Search documents', 'ابحث في المستندات')
page('documents.html', 'title.documents', 'Documents', 'المستندات', docs, 'SA', 'documents', ('nav.documents', 'Documents', 'المستندات'), doc_drawer)

# ---------- Accounting dashboard ----------
mo = [('m.jun', 'Jun', 'يونيو', 62, 48), ('m.jul', 'Jul', 'يوليو', 70, 52), ('m.aug', 'Aug', 'أغسطس', 55, 50), ('m.sep', 'Sep', 'سبتمبر', 78, 62.6), ('m.oct', 'Oct', 'أكتوبر', 84, 67.2), ('m.nov', 'Nov', 'نوفمبر', 12, 6)]
pairs = ''.join(f'<div class="bar"><div class="pair"><i style="height:{a * 2}px"></i><i style="height:{b * 2}px"></i></div>{T(k, e, ar)}</div>' for k, e, ar, a, b in mo)
chq = ''.join(f'<div class="list-row"><span class="tile-icon">{ic("cheque", "icon--sm")}</span><div class="grow"><b>{n}</b>{T(k, d, da, "small")}</div><div style="text-align:end"><b class="num">QAR {v}</b><span class="badge badge--{t}" data-i18n="{sk}">{EN[sk]}</span></div></div>' for n, k, d, da, v, t, sk in [('Al-Mannai Villa', 'chq1', 'Received · QNB · due 4 Nov', 'مستلم · QNB · يستحق ٤ نوفمبر', '85,000', 'ok', 'chq.in'), ('Gulf Marble Trading', 'chq2', 'Issued · CBQ · due 5 Nov', 'صادر · CBQ · يستحق ٥ نوفمبر', '42,300', 'warn', 'chq.out'), ('Doha Gypsum Co.', 'chq3', 'Issued · QNB · due 7 Nov', 'صادر · QNB · يستحق ٧ نوفمبر', '18,750', 'warn', 'chq.out')] if K('chq.in', 'In', 'وارد') and K('chq.out', 'Out', 'صادر'))
bud = ''.join(f'<div class="stack stack--sm" style="gap:6px;padding:8px 0"><div class="between"><b style="font-size:13.5px">{n}</b><span class="num {"note--danger" if p > 100 else "muted"}">{p}%</span></div><div class="progress{" progress--danger" if p > 100 else ""}"><span style="width:{min(p, 100)}%"></span></div></div>' for n, p in [('Office fit-out — West Bay', 108), ('Villa interior — Lusail', 92), ('Majlis renovation — Al Waab', 71)])
acc = f'''{hdr("nav.accounting", "Accounting", "المحاسبة", "acc.hello", "Good afternoon, Aisha", "مساء الخير يا عائشة", "acc.month", "November 2026", "نوفمبر ٢٠٢٦", btn("secondary", "acc.receipt", "Upload receipt", "رفع إيصال", "camera") + btn("primary", "acc.invoice", "New invoice", "فاتورة جديدة", "plus"))}
<div class="tabs">{''.join(f'<a class="tab" href="#" aria-selected="{str(i == 0).lower()}">{T(k, e, a)}</a>' for i, (k, e, a) in enumerate([("at.dash", "Dashboard", "الرئيسية"), ("at.inv", "Invoices", "الفواتير"), ("at.bills", "Bills", "فواتير الموردين"), ("at.banks", "Banks & cheques", "البنوك والشيكات"), ("at.journal", "Journal", "القيود اليومية"), ("at.reports", "Reports", "التقارير")]))}</div>
<div class="grid-4">{kpi("acc.k1", "Cash in banks", "النقد في البنوك", "QAR 1.84M", "acc.k1n", "QNB · CBQ · Doha Bank", "QNB · CBQ · بنك الدوحة")}{kpi("acc.k2", "Owed to ASAS", "مستحقات لأساس", "QAR 726K", "acc.k2n", "QAR 212K overdue", "٢١٢ ألف ريال متأخرة", "danger")}{kpi("acc.k3", "ASAS owes", "التزامات أساس", "QAR 318K", "acc.k3n", "12 bills open", "١٢ فاتورة مفتوحة")}{kpi("acc.k4", "Profit · October", "الربح · أكتوبر", "QAR 168K", "acc.k4n", "▲ 9% vs September", "▲ ٩٪ مقارنة بسبتمبر", dark=True)}</div>
<div class="split"><div class="card"><div class="between"><div>{T("acc.chart", "Income vs expenses", "الإيرادات مقابل المصروفات", "h3", 'class="card-title"')}{T("acc.chartS", "QAR × 10,000 · November is month to date", "بالريال × ١٠٬٠٠٠ · نوفمبر حتى تاريخه", "p", 'class="card-sub"')}</div><div class="hstack">{T("acc.inc", "Income", "الإيرادات", "span", 'class="legend"')}{T("acc.exp", "Expenses", "المصروفات", "span", 'class="legend" style="--legend:var(--silver)"')}</div></div><div class="bars">{pairs}</div></div>
<div class="stack"><div class="card"><div class="between">{T("acc.cheques", "Cheques due this week", "شيكات مستحقة هذا الأسبوع", "h3", 'class="card-title"')}</div>{chq}</div><div class="card">{T("acc.budgets", "Project budgets", "ميزانيات المشاريع", "h3", 'class="card-title"')}{T("acc.budgetsS", "Spent vs approved budget", "المصروف مقابل الميزانية المعتمدة", "p", 'class="card-sub"')}{bud}</div></div></div>'''
page('accounting.html', 'title.accounting', 'Accounting', 'المحاسبة', acc, 'ACC', 'accounting', ('nav.accounting', 'Accounting', 'المحاسبة'))

# ---------- Salary run ----------
SB = [('ASAS-0142', 'Mohammed Rahman', 'QNB', '•••• 4471', '14,000', '3,500', '0', '17,500'), ('ASAS-0120', 'Layla Hassan', 'CBQ', '•••• 0932', '11,000', '2,500', '0', '13,500'), ('ASAS-0108', 'Aisha Karim', 'QNB', '•••• 7810', '12,500', '2,800', '0', '15,300'), ('ASAS-0115', 'Omar Farouk', 'Doha Bank', '•••• 2205', '5,500', '1,200', '250', '6,450'), ('ASAS-0191', 'Yousef Haddad', 'QIB', '•••• 3364', '13,000', '3,000', '400', '15,600'), ('ASAS-0131', 'Reem Saleh', 'QNB', '•••• 5528', '15,000', '3,500', '0', '18,500')]
for k, e, a in [('col.empId', 'Employee ID', 'الرقم الوظيفي'), ('col.bank', 'Bank', 'البنك'), ('col.account', 'Account', 'الحساب'), ('col.basic', 'Basic', 'الأساسي'), ('col.allow', 'Allowances', 'البدلات'), ('col.deduct', 'Deductions', 'الخصومات'), ('col.net', 'Net QAR', 'الصافي بالريال')]: K(k, e, a)
srows = ''.join(f'<tr><td data-label=""><input type="checkbox" checked aria-label="Select"></td><td data-label="{EN["col.empId"]}" data-i18n-label="col.empId" class="num muted">{a}</td><td data-label="{EN["col.name"]}" data-i18n-label="col.name" class="strong">{n}</td><td data-label="{EN["col.bank"]}" data-i18n-label="col.bank">{b}</td><td data-label="{EN["col.account"]}" data-i18n-label="col.account" class="mono muted">{ac}</td><td data-label="{EN["col.basic"]}" data-i18n-label="col.basic" class="num end">{bs}</td><td data-label="{EN["col.allow"]}" data-i18n-label="col.allow" class="num end">{al}</td><td data-label="{EN["col.deduct"]}" data-i18n-label="col.deduct" class="num end" style="color:{"var(--danger)" if d != "0" else "var(--text-muted)"}">{d}</td><td data-label="{EN["col.net"]}" data-i18n-label="col.net" class="num end strong">{nt}</td></tr>' for a, n, b, ac, bs, al, d, nt in SB)
st = lambda cls, n, k, e, a, sk, se, sa: f'<div class="step {cls}"><span class="n">{n}</span><div>{T(k, e, a, "b")}{T(sk, se, sa, "small")}</div></div>'
pay_modal = f'''<div class="modal" id="confirm" role="dialog" aria-modal="true" aria-labelledby="pay-title">
  <div class="between"><h2 id="pay-title" style="font-size:22px">{T("pay.confirmT", "Confirm payment", "تأكيد الدفع")}</h2><button class="close" data-close aria-label="Close" data-i18n-aria="common.close">{ic("x", "icon--sm")}</button></div>
  <div class="card card--dark">{T("pay.youPay", "You are paying", "سيتم دفع", "small", 'style="color:var(--steel)"')}<div class="num" style="font-size:34px;font-weight:300;color:var(--champagne)">QAR 468,850</div>{T("pay.to44", "to 44 employees by bank transfer", "إلى ٤٤ موظفاً بالتحويل البنكي", "small", 'style="color:var(--mist)"')}</div>
  <div><div class="kv">{T("pay.from", "Pay from", "الدفع من")}<b class="num">QNB Main •••• 1102</b></div><div class="kv">{T("pay.approvedBy", "Approved by", "اعتمدها")}<b>Saad Al-Kaabi, CEO</b></div><div class="kv">{T("pay.month", "Salary month", "شهر الراتب")}<b>{T("pay.oct", "October 2026", "أكتوبر ٢٠٢٦")}</b></div></div>
  <label class="check"><input type="checkbox" checked>{T("pay.wps", "Create and upload the WPS salary file", "إنشاء ملف رواتب نظام حماية الأجور ورفعه")}</label>
  <label class="check"><input type="checkbox" checked>{T("pay.slips", "Email payslips to employees", "إرسال قسائم الرواتب للموظفين بالبريد")}</label>
  <div class="hstack" style="justify-content:flex-end">{btn("ghost", "btn.cancel", EN["btn.cancel"], AR["btn.cancel"], attrs="data-close")}{btn("accent", "pay.confirm", "Confirm & pay", "تأكيد ودفع", "check", 'data-close data-toast="paid"')}</div>
</div>
<div class="toast" id="paid" role="status"><span class="tick">{ic("check", "icon--sm")}</span><div><b>{T("pay.doneT", "Salaries sent", "تم تحويل الرواتب")}</b><small>{T("pay.doneS", "44 transfers · WPS file uploaded · payslips emailed", "٤٤ تحويلاً · تم رفع ملف حماية الأجور · أُرسلت القسائم")}</small></div></div>'''
sal = f'''{hdr("nav.payroll", "Payroll", "الرواتب", "pay.title", "Salary run · October 2026", "مسيّر رواتب · أكتوبر ٢٠٢٦", "pay.sub", "48 employees · approved by CEO on 1 Nov", "٤٨ موظفاً · اعتمدها الرئيس التنفيذي في ١ نوفمبر", btn("secondary", "pay.wpsBtn", "Export WPS file", "تصدير ملف حماية الأجور", "download"))}
<div class="card steps">{st("", ic("check", "icon--sm"), "pay.s1", "Attendance", "الحضور", "pay.s1s", "from HR · 31 Oct", "من الموارد البشرية · ٣١ أكتوبر")}<span class="step-line"></span>{st("", ic("check", "icon--sm"), "pay.s2", "Salary report", "كشف الرواتب", "pay.s2s", "Aisha Karim · 31 Oct", "عائشة كريم · ٣١ أكتوبر")}<span class="step-line"></span>{st("", ic("check", "icon--sm"), "pay.s3", "Approved", "معتمد", "pay.s3s", "CEO · 1 Nov", "الرئيس التنفيذي · ١ نوفمبر")}<span class="step-line"></span>{st("step--current", ic("wallet", "icon--sm"), "pay.s4", "Pay", "الدفع", "pay.s4s", "Ready to pay", "جاهز للدفع")}</div>
<div class="between"><div class="segmented" data-group><button aria-pressed="true">{ic("bank", "icon--sm")} {T("pay.bank", "Bank transfer · 44", "تحويل بنكي · ٤٤")}</button><button aria-pressed="false">{T("pay.cash", "Cash / cheque · 4", "نقداً / شيك · ٤")}</button></div><select class="select" style="width:260px"><option>QNB Main •••• 1102</option></select></div>
<div class="card card--flush table-wrap"><table class="table table--cards"><thead><tr><th></th><th data-i18n="col.empId">Employee ID</th><th data-i18n="col.name">Name</th><th data-i18n="col.bank">Bank</th><th data-i18n="col.account">Account</th><th class="end" data-i18n="col.basic">Basic</th><th class="end" data-i18n="col.allow">Allowances</th><th class="end" data-i18n="col.deduct">Deductions</th><th class="end" data-i18n="col.net">Net QAR</th></tr></thead><tbody>{srows}</tbody></table></div>
<div class="card between"><span class="hstack muted">{ic("lock", "icon--sm")}{T("pay.lock", "Bank details are managed by Super Admin", "يدير مدير النظام بيانات الحسابات البنكية")}</span><div class="hstack"><div style="text-align:end">{T("pay.total44", "Total · 44 employees by bank", "الإجمالي · ٤٤ موظفاً بالتحويل", "small", 'class="muted" style="display:block"')}<strong class="num" style="font-size:26px;font-weight:300">QAR 468,850</strong></div>{btn("accent", "pay.pay", "Pay salaries", "دفع الرواتب", "send", 'data-open="confirm"', "lg")}</div></div>'''
page('salary-run.html', 'title.salary', 'Salary run', 'مسيّر الرواتب', sal, 'ACC', 'payroll', ('nav.payroll', 'Payroll', 'الرواتب'), pay_modal)

# ---------- Settings ----------
sett = f'''{hdr(None, "", "", "nav.settings", "Settings", "الإعدادات", "set.sub", "Your profile, language, theme and security", "ملفك واللغة والمظهر والأمان", btn("ghost", "btn.cancel", EN["btn.cancel"], AR["btn.cancel"]) + btn("primary", "set.save", "Save changes", "حفظ التغييرات", "check", 'data-toast="saved"'))}
<div class="split"><div class="stack">
  <div class="card stack">{T("set.profile", "Profile", "الملف الشخصي", "h3", 'class="card-title"')}<div class="person"><span class="avatar avatar--lg" style="background:var(--onyx);color:var(--champagne)">AS</span><div><b style="font-size:18px">Abdullah S.</b><small>{W("role.superAdmin")}</small></div></div>
  <div class="form-grid form-grid--2"><div class="field"><label>{W("reg.name")}</label><input class="input" value="Abdullah S."></div><div class="field"><label>{W("auth.email")}</label><input class="input" value="a.salah@asasqa.com"></div><div class="field"><label>{W("reg.mobile")}</label><input class="input num" value="+974 6623 6083"></div><div class="field"><label>{W("reg.empId")}</label><input class="input num" value="ASAS-0001"></div></div></div>
  <div class="card stack">{T("set.security", "Security", "الأمان", "h3", 'class="card-title"')}
  {''.join(f'<div class="between"><div>{T(k, e, a, "b")}{T(k + "s", s, sa, "small", "class=\"muted\" style=\"display:block\"")}</div><label class="switch"><input type="checkbox" checked><span></span></label></div>' for k, e, a, s, sa in [("set.2fa", "2-step verification", "التحقق بخطوتين", "Code by SMS at every new sign-in", "رمز عبر الرسائل عند كل دخول جديد"), ("set.alerts", "Sign-in alerts", "تنبيهات الدخول", "Email me when my account is used on a new device", "راسلني عند استخدام حسابي من جهاز جديد")])}</div>
</div><div class="stack">
  <div class="card stack stack--sm">{T("set.lang", "Language", "اللغة", "h3", 'class="card-title"')}<div class="segmented" style="width:100%"><button data-lang="en" aria-pressed="true" style="flex:1">English</button><button data-lang="ar" aria-pressed="false" style="flex:1;font-family:var(--font-arabic)">العربية</button></div>{T("set.langS", "Arabic switches the whole layout to right-to-left.", "العربية تقلب الواجهة بالكامل من اليمين إلى اليسار.", "small", 'class="muted"')}</div>
  <div class="card stack stack--sm">{T("set.theme", "Theme", "المظهر", "h3", 'class="card-title"')}<div class="grid-2"><button class="theme-card" data-set-theme="light" aria-pressed="true"><i></i><span></span></button><button class="theme-card theme-card--dark" data-set-theme="dark" aria-pressed="false"><i></i><span></span></button></div><div class="grid-2">{T("set.light", "Porcelain · light", "بورسلين · فاتح", "small")}{T("set.dark", "Onyx · dark", "أونيكس · داكن", "small")}</div></div>
</div></div>'''
page('settings.html', 'title.settings', 'Settings', 'الإعدادات', sett, 'SA', 'settings', ('nav.settings', 'Settings', 'الإعدادات'), f'<div class="toast" id="saved" role="status"><span class="tick">{ic("check", "icon--sm")}</span><div><b>{T("set.savedT", "Changes saved", "تم حفظ التغييرات")}</b></div></div>')

# ---------- Translations ----------
_dig = str.maketrans('٠١٢٣٤٥٦٧٨٩٫٬', '0123456789.,')  # Western digits in Arabic UI, same as Figma
for _k in AR: AR[_k] = AR[_k].translate(_dig)
for k in list(EN):
    if not EN[k] and k in AR: pass
os.makedirs(os.path.join(D, 'assets/i18n'), exist_ok=True); os.makedirs(os.path.join(D, 'assets/js'), exist_ok=True)
json.dump(dict(sorted(EN.items())), open(os.path.join(D, 'assets/i18n/en.json'), 'w'), ensure_ascii=False, indent=2)
json.dump(dict(sorted(AR.items())), open(os.path.join(D, 'assets/i18n/ar.json'), 'w'), ensure_ascii=False, indent=2)
open(os.path.join(D, 'assets/js/i18n.js'), 'w').write('/* Generated from assets/i18n/*.json — do not edit by hand */\nwindow.ASAS_I18N = ' + json.dumps({'en': dict(sorted(EN.items())), 'ar': dict(sorted(AR.items()))}, ensure_ascii=False) + ';\n')
missing = [k for k in EN if not AR.get(k)]
print(len(EN), 'keys; missing ar:', missing)
