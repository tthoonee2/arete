import numpy as np, numba as nb, zlib, base64, io, json, time
from scipy import ndimage
from PIL import Image
rng = np.random.default_rng(7)
N, S = 1024, 10000.0                     # grid size, metres across
cell = S / (N - 1)
z, x = np.meshgrid(np.linspace(-S/2, S/2, N), np.linspace(-S/2, S/2, N), indexing="ij")  # row i -> z (north = -z at top)

def fbm_grid(n, octaves, base, seed, periodic=False):
    r = np.random.default_rng(seed); out = np.zeros((n, n)); amp = 1.0; tot = 0
    for o in range(octaves):
        res = base * 2**o
        g = r.standard_normal((res + 1, res + 1))
        if periodic: g[-1, :] = g[0, :]; g[:, -1] = g[:, 0]
        out += amp * ndimage.zoom(g, n / (res + 1) * (1 + 1e-9), order=3)[:n, :n]; tot += amp; amp *= 0.5
    return out / tot

def pyramid(cx, cz, h, R, rot, p=1.5):
    c, s = np.cos(rot), np.sin(rot); u = (x - cx) * c + (z - cz) * s; v = -(x - cx) * s + (z - cz) * c
    d = (np.abs(u) + np.abs(v)) / R
    return h * np.clip(1 - d, 0, 1) ** p

t0 = time.time()
def ridged_mf(n, octaves, base, seed):
    r = np.random.default_rng(seed); out = np.zeros((n, n)); w = np.ones((n, n)); amp = 1.0; tot = 0
    for o in range(octaves):
        res = base * 2**o; g = r.standard_normal((res + 1, res + 1))
        nz = ndimage.zoom(g, n / (res + 1) * (1 + 1e-9), order=3)[:n, :n]
        sig = (1.0 - np.abs(nz * 0.9)) ** 2 * w
        w = np.clip(sig * 1.6, 0, 1)
        out += amp * sig; tot += amp; amp *= 0.52
    return out / tot
w1, w2 = fbm_grid(N, 5, 3, 1), fbm_grid(N, 5, 3, 2)
ii, jj = np.meshgrid(np.arange(N), np.arange(N), indexing="ij")
# ranges: ridged multifractal, strongest behind and to the sides, low valley in front
rmf = ridged_mf(N, 8, 3, 3)
rmf = ndimage.map_coordinates(rmf, [ii + 30 * w1, jj + 30 * w2], order=1, mode="reflect")
rng_mask = np.clip(0.55 + 0.45 * fbm_grid(N, 3, 2, 6) - 0.55 * np.clip((z - 600) / 3500, 0, 1), 0, 1)
H = 2300 * rmf * rng_mask
H += 700 * np.exp(-((x**2 + z**2) / 3600**2))
# the horn: four sharp ridges, straight steep faces fluted by couloirs
xw = x + 70 * w1; zw = z + 70 * w2
c, s_ = np.cos(np.pi / 4 + 0.1), np.sin(np.pi / 4 + 0.1); u = xw * c + zw * s_; v = -xw * s_ + zw * c
d = (np.abs(u) + np.abs(v)) / 2900
prof = np.clip(1 - d, 0, 1)
horn = 3000 * prof ** 1.22 + 170 * prof * np.exp(-(np.minimum(np.abs(u), np.abs(v)) / 170) ** 2)
th = np.arctan2(zw, xw); rr = np.hypot(xw, zw)
NA, NR = 720, 256
pg = np.zeros((NA, NR)); r_ = np.random.default_rng(12); amp = 1; tot = 0
for o in range(4):
    ka, kr = 36 * 2**o, 6 * 2**o
    gg = r_.standard_normal((ka, kr + 1)); gg = np.vstack([gg, gg[:1]])
    pg += amp * ndimage.zoom(gg, (NA / ka * (1 + 1e-9), NR / (kr + 1) * (1 + 1e-9)), order=3, mode="grid-wrap")[:NA, :NR]; tot += amp; amp *= .5
pg /= tot
ai = (th + np.pi) / (2 * np.pi) * NA; ri_ = np.clip(rr / 3500 * (NR - 1), 0, NR - 1)
flute = 1 - np.abs(ndimage.map_coordinates(pg, [ai, ri_], order=1, mode="grid-wrap") * 2.2)
ridgeness = np.exp(-(np.minimum(np.abs(u), np.abs(v)) / 260) ** 2)
horn -= 140 * (1 - np.clip(flute, 0, 1)) * (prof > 0.05) * np.clip(prof * 3, 0, 1) * (1 - ridgeness)
H = np.maximum(H, horn + 0.2 * H)
# valley in front (south, +z), winding
vc = 600 * np.sin(z / 1700)
H -= 450 * np.exp(-((x - vc) / 950) ** 2) * np.clip((z - 1000) / 2000, 0, 1)
edge = np.minimum(np.minimum(x + S/2, S/2 - x), np.minimum(z + S/2, S/2 - z))
H *= np.clip(edge / 1500, 0, 1) ** 0.7
alt = np.clip(H / 1500, 0, 1)
H += 90 * (ridged_mf(N, 6, 8, 8) - 0.5) * alt + 90 * fbm_grid(N, 6, 3, 4) + 25 * fbm_grid(N, 4, 24, 5)
H -= H.min()
print("base", round(time.time() - t0, 1), "s, max", H.max())

# ---------- hydraulic erosion (droplets, Lague-style) ----------
@nb.njit(cache=True)
def erode(h, n_drops, seed, flow, depo):
    np.random.seed(seed); n = h.shape[0]; R = 2
    offs = []; ws = []
    for dy in range(-R, R + 1):
        for dx in range(-R, R + 1):
            d = np.sqrt(dx * dx + dy * dy)
            if d <= R: offs.append((dy, dx)); ws.append(1 - d / R)
    wsum = 0.0
    for w in ws: wsum += w
    for k in range(n_drops):
        px = np.random.random() * (n - 2) + 0.5; py = np.random.random() * (n - 2) + 0.5
        dx = 0.0; dy = 0.0; speed = 1.0; water = 1.0; sed = 0.0
        for step in range(80):
            xi = int(px); yi = int(py)
            if xi < 1 or yi < 1 or xi >= n - 2 or yi >= n - 2: break
            fx = px - xi; fy = py - yi
            h00 = h[yi, xi]; h10 = h[yi, xi + 1]; h01 = h[yi + 1, xi]; h11 = h[yi + 1, xi + 1]
            gx = (h10 - h00) * (1 - fy) + (h11 - h01) * fy; gy = (h01 - h00) * (1 - fx) + (h11 - h10) * fx
            hold = h00 * (1 - fx) * (1 - fy) + h10 * fx * (1 - fy) + h01 * (1 - fx) * fy + h11 * fx * fy
            dx = dx * 0.05 - gx * 0.95; dy = dy * 0.05 - gy * 0.95
            l = np.sqrt(dx * dx + dy * dy)
            if l < 1e-9: break
            dx /= l; dy /= l; px += dx; py += dy
            if px < 1 or py < 1 or px >= n - 2 or py >= n - 2: break
            flow[yi, xi] += water
            nxi = int(px); nyi = int(py); nfx = px - nxi; nfy = py - nyi
            hnew = h[nyi, nxi] * (1 - nfx) * (1 - nfy) + h[nyi, nxi + 1] * nfx * (1 - nfy) + h[nyi + 1, nxi] * (1 - nfx) * nfy + h[nyi + 1, nxi + 1] * nfx * nfy
            dh = hnew - hold
            cap = max(-dh, 0.01) * speed * water * 4.0
            if sed > cap or dh > 0:
                amt = min(dh, sed) if dh > 0 else (sed - cap) * 0.3
                sed -= amt
                h[yi, xi] += amt * (1 - fx) * (1 - fy); h[yi, xi + 1] += amt * fx * (1 - fy)
                h[yi + 1, xi] += amt * (1 - fx) * fy; h[yi + 1, xi + 1] += amt * fx * fy
                depo[yi, xi] += amt
            else:
                amt = min((cap - sed) * 0.3, -dh)
                for q in range(len(offs)):
                    oy, ox = offs[q]; yy = yi + oy; xx = xi + ox
                    if 0 <= yy < n and 0 <= xx < n:
                        e = amt * ws[q] / wsum
                        h[yy, xx] -= e
                sed += amt
            speed = np.sqrt(max(speed * speed + dh * 4.0, 0.0)); water *= 0.985
    return h

hc = H / cell                      # erode in cell units
flow = np.zeros_like(hc); depo = np.zeros_like(hc)
t0 = time.time(); hc = erode(hc, 1200000, 11, flow, depo); print("erosion", round(time.time() - t0, 1), "s")
H = hc * cell; H = 0.5 * H + 0.5 * ndimage.gaussian_filter(H, 1.0); H -= H.min(); Hmax = H.max(); print("max", Hmax)

# ---------- export heights (uint16, deflate) ----------
q = np.round(H / Hmax * 65535).astype("<u2")
blob = base64.b64encode(zlib.compress(q.tobytes(), 9)).decode()
json.dump({"n": N, "size": S, "hmax": float(Hmax), "b64": blob}, open("height.json", "w"))
print("height b64 KB", len(blob) // 1024)

# ---------- 2048 textures ----------
M = 2048; up = ndimage.zoom(H, M / N, order=3)[:M, :M]
up += 1.2 * fbm_grid(M, 4, 96, 21)                       # micro relief for lighting
c2 = S / (M - 1)
gz, gx = np.gradient(up, c2)
nrm = np.dstack([-gx, np.ones_like(up), -gz]); nrm /= np.linalg.norm(nrm, axis=2, keepdims=True)
ny_fine = nrm[..., 1]
sz_, sx_ = np.gradient(ndimage.gaussian_filter(up, 2.5), c2)
ns = np.dstack([-sx_, np.ones_like(up), -sz_]); ns /= np.linalg.norm(ns, axis=2, keepdims=True)
ny = ns[..., 1]; north = -ns[..., 2]
fl = ndimage.zoom(np.log1p(flow), M / N, order=1)[:M, :M]; fl = (fl - fl.min()) / (np.ptp(fl) + 1e-9)
dp = ndimage.zoom(np.log1p(np.maximum(depo, 0)), M / N, order=1)[:M, :M]; dp = dp / (dp.max() + 1e-9)
n1 = fbm_grid(M, 6, 8, 31); n2 = fbm_grid(M, 5, 24, 32); n3 = fbm_grid(M, 4, 60, 33)
sm = lambda a, b, v: np.clip((v - a) / (b - a), 0, 1) ** 2 * (3 - 2 * np.clip((v - a) / (b - a), 0, 1))
# cavity / ambient occlusion from multi-scale height differences
ao = np.ones_like(up)
for sg, k in [(4, 0.010), (16, 0.004), (48, 0.0016)]:
    ao -= k * np.clip(ndimage.gaussian_filter(up, sg) - up, 0, None)
ao = np.clip(ao, 0.35, 1.0)
col = lambda r, g, b: np.array([r, g, b], dtype=float)
# rock: gneiss with strata bands and warm oxidised patches
band = 0.5 + 0.5 * np.sin(up / 38 + n1 * 6)
rock = col(.43, .40, .37) * (0.82 + 0.25 * band[..., None]) + col(.06, .03, .0) * sm(.1, .5, n2)[..., None]
rock *= (0.88 + 0.22 * n2[..., None])
scree = col(.56, .53, .49) * (0.9 + 0.2 * n3[..., None])
rock = rock + (scree - rock) * (sm(.15, .5, dp) * sm(.55, .8, ny))[..., None]
# vegetation low down
meadow = col(.33, .40, .19) * (0.85 + 0.3 * n2[..., None]); forest = col(.13, .19, .11) * (0.85 + 0.3 * n3[..., None])
veg = meadow + (forest - meadow) * (sm(.0, .35, n1) * sm(150, 350, up) * sm(900, 650, up))[..., None]
vegAmt = sm(1050 + 150 * n1, 750 + 150 * n1, up) * sm(.72, .86, ny) * (1 - 0.6 * sm(.3, .8, dp))
alb = rock + (veg - rock) * vegAmt[..., None]
# snow: altitude line lower on north faces, holds on <50 deg, fills gullies on steep faces
line = 1150 + 260 * n1 - 300 * north
snowA = sm(line - 80, line + 160, up)
hold = np.maximum(sm(.48, .72, ny), 0.9 * sm(.3, .65, fl) * sm(.28, .5, ny))
snow = np.clip(snowA * hold, 0, 1)
snowCol = col(.93, .95, .98) * (0.95 + 0.05 * n2[..., None]); glacier = col(.80, .87, .93)
snowCol = snowCol + (glacier - snowCol) * (sm(.92, .98, ny) * sm(.3, .7, fl))[..., None]
alb = alb + (snowCol - alb) * snow[..., None]
alb *= (ao ** 0.9)[..., None] * (1 - 0.25 * (fl * (1 - snow))[..., None])
srgb = np.clip(alb, 0, 1)
Image.fromarray((srgb * 255).astype(np.uint8)).save("albedo.jpg", quality=86, optimize=True)
Image.fromarray(((nrm * 0.5 + 0.5) * 255).astype(np.uint8)).save("normal.jpg", quality=86, optimize=True)
# tileable detail texture
d = fbm_grid(512, 5, 8, 41, periodic=True) * 0.6 + fbm_grid(512, 4, 32, 42, periodic=True) * 0.4
d = (d - d.min()) / np.ptp(d); Image.fromarray((d * 255).astype(np.uint8)).save("detail.jpg", quality=85)
# quick previews: hillshade x albedo
L = np.array([-0.5, 0.55, 0.65]); L /= np.linalg.norm(L)
shade = np.clip((nrm @ L), 0, 1) * 0.85 + 0.25
Image.fromarray((np.clip(srgb * shade[..., None], 0, 1) * 255).astype(np.uint8)).resize((1024, 1024)).save("preview.png")
import os; print({f: os.path.getsize(f) // 1024 for f in ["albedo.jpg", "normal.jpg", "detail.jpg"]})
