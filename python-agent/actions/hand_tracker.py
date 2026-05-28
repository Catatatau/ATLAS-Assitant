import cv2
import pyautogui
import threading
import time
import math
import logging
import os
import collections
import numpy as np

import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

pyautogui.FAILSAFE = False
pyautogui.PAUSE = 0

# ─────────────────────────────────────────────
# Constantes visuais e de rede (Tech / Cyberpunk)
# ─────────────────────────────────────────────
HAND_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 4),          # Polegar
    (0, 5), (5, 6), (6, 7), (7, 8),           # Indicador
    (0, 9), (9, 10), (10, 11), (11, 12),      # Médio
    (0, 13), (13, 14), (14, 15), (15, 16),    # Anelar
    (0, 17), (17, 18), (18, 19), (19, 20),    # Mínimo
    (5, 9), (9, 13), (13, 17),                 # Palma
]

FINGER_TIPS  = [4, 8, 12, 16, 20]
FINGER_PIPS  = [2, 6, 10, 14, 18]
FINGER_MCPS  = [1, 5, 9, 13, 17]
PALM_ANCHORS = [0, 5, 9, 13, 17]
FINGER_CHAINS = [
    ([0, 1, 2, 3, 4], (80, 190, 255)),
    ([0, 5, 6, 7, 8], (255, 230, 80)),
    ([0, 9, 10, 11, 12], (120, 255, 150)),
    ([0, 13, 14, 15, 16], (70, 210, 255)),
    ([0, 17, 18, 19, 20], (255, 150, 220)),
]

# ─────────────────────────────────────────────
# Thread de leitura de câmera de alta performance
# ─────────────────────────────────────────────
class CameraReader:
    def __init__(self, width=1280, height=720):
        self.cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH,  width)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
        self.cap.set(cv2.CAP_PROP_FPS, 60)
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        self.cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'MJPG'))
        self.frame   = None
        self.running = True
        self.t = threading.Thread(target=self._loop, daemon=True)
        self.t.start()

    def _loop(self):
        while self.running:
            ok, img = self.cap.read()
            if ok:
                self.frame = cv2.flip(img, 1)

    def get_frame(self):
        return self.frame

    def release(self):
        self.running = False
        self.t.join(timeout=1)
        self.cap.release()

# ─────────────────────────────────────────────
# Helpers de Geometria e Lógica Analítica
# ─────────────────────────────────────────────
def landmark_px(lm, w, h):
    return int(lm.x * w), int(lm.y * h)

def palm_center_norm(lms):
    x = sum(lms[i].x for i in PALM_ANCHORS) / len(PALM_ANCHORS)
    y = sum(lms[i].y for i in PALM_ANCHORS) / len(PALM_ANCHORS)
    return x, y

def palm_center_px(lms, w, h):
    x, y = palm_center_norm(lms)
    return int(x * w), int(y * h)

def fingers_up(lms):
    result = []
    result.append(lms[4].x < lms[3].x)
    for tip_i, pip_i in zip(FINGER_TIPS[1:], FINGER_PIPS[1:]):
        result.append(lms[tip_i].y < lms[pip_i].y)
    return result

def is_pinching(lms):
    dx = lms[4].x - lms[8].x
    dy = lms[4].y - lms[8].y
    dz = lms[4].z - lms[8].z
    dist = math.sqrt(dx*dx + dy*dy + dz*dz)
    return dist < 0.06

# ─────────────────────────────────────────────
# Desenho Profissional e Holográfico
# ─────────────────────────────────────────────
def draw_3d_cube(img, center, size, angle_x, angle_y, angle_z):
    vertices = [
        [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
        [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
    ]
    edges = [
        (0,1), (1,2), (2,3), (3,0),
        (4,5), (5,6), (6,7), (7,4),
        (0,4), (1,5), (2,6), (3,7)
    ]
    cx, cy = center
    
    cx_a, sx_a = math.cos(angle_x), math.sin(angle_x)
    cy_a, sy_a = math.cos(angle_y), math.sin(angle_y)
    cz_a, sz_a = math.cos(angle_z), math.sin(angle_z)
    
    projected = []
    for v in vertices:
        x, y, z = v[0]*size, v[1]*size, v[2]*size
        # Rot X
        y1 = y*cx_a - z*sx_a
        z1 = y*sx_a + z*cx_a
        y, z = y1, z1
        # Rot Y
        x1 = x*cy_a + z*sy_a
        z1 = -x*sy_a + z*cy_a
        x, z = x1, z1
        # Rot Z
        x1 = x*cz_a - y*sz_a
        y1 = x*sz_a + y*cz_a
        x, y = x1, y1
        
        px = int(cx + x)
        py = int(cy + y)
        projected.append((px, py))
        
    overlay = img.copy()
    for e in edges:
        p1, p2 = projected[e[0]], projected[e[1]]
        cv2.line(overlay, p1, p2, (255, 200, 50), 3, cv2.LINE_AA)
    cv2.addWeighted(overlay, 0.6, img, 0.4, 0, img)
    
    for e in edges:
        p1, p2 = projected[e[0]], projected[e[1]]
        cv2.line(img, p1, p2, (255, 255, 255), 1, cv2.LINE_AA)
        
    for p in projected:
        cv2.circle(img, p, 3, (0, 255, 255), -1, cv2.LINE_AA)

def draw_skeleton_legacy(img, lms, is_secondary=False):
    h, w = img.shape[:2]
    overlay = img.copy()
    
    if is_secondary:
        color_glow = (100, 100, 100)
        color_core = (180, 180, 180)
        color_joint = (80, 80, 80)
    else:
        color_glow = (255, 150, 0) # Cyan glow in BGR
        color_core = (255, 255, 100)
        color_joint = (0, 220, 255) # Orange/Gold joints

    # Preenchimento translúcido da palma (Mesh)
    palm_pts = [landmark_px(lms[i], w, h) for i in [0, 5, 9, 13, 17]]
    cv2.fillPoly(overlay, [np.array(palm_pts)], color_glow)
    cv2.addWeighted(overlay, 0.15, img, 0.85, 0, img)

    # Brilho externo dos ossos (Glow Effect)
    overlay2 = img.copy()
    for a, b in HAND_CONNECTIONS:
        ax, ay = landmark_px(lms[a], w, h)
        bx, by = landmark_px(lms[b], w, h)
        cv2.line(overlay2, (ax, ay), (bx, by), color_glow, 6, cv2.LINE_AA)
    cv2.addWeighted(overlay2, 0.3, img, 0.7, 0, img)

    # Núcleo dos ossos
    for a, b in HAND_CONNECTIONS:
        ax, ay = landmark_px(lms[a], w, h)
        bx, by = landmark_px(lms[b], w, h)
        cv2.line(img, (ax, ay), (bx, by), color_core, 1, cv2.LINE_AA)

    # Articulações e Nódulos
    for i, lm in enumerate(lms):
        px, py = landmark_px(lm, w, h)
        
        if i in FINGER_TIPS:
            # Pontas dos dedos em formato de "mira" em cruz
            cv2.line(img, (px-5, py), (px+5, py), color_joint, 1, cv2.LINE_AA)
            cv2.line(img, (px, py-5), (px, py+5), color_joint, 1, cv2.LINE_AA)
            cv2.circle(img, (px, py), 2, (255, 255, 255), -1, cv2.LINE_AA)
        elif i == 0:
            # Pulso
            cv2.circle(img, (px, py), 6, color_joint, -1, cv2.LINE_AA)
            cv2.circle(img, (px, py), 3, (255, 255, 255), -1, cv2.LINE_AA)
        else:
            # Juntas normais (quadrados pequenos para parecer high-tech)
            pts = np.array([[px, py-3], [px+3, py], [px, py+3], [px-3, py]])
            cv2.fillPoly(img, [pts], color_joint)

def draw_reticle_legacy(img, cx, cy, color, time_offset, is_clicking=False):
    """Desenha a mira de controle do mouse com animação."""
    r = 24
    # Rotação animada das bordas
    angle = time_offset * 2.0
    pts1 = (int(cx + r * math.cos(angle)), int(cy + r * math.sin(angle)))
    pts2 = (int(cx + r * math.cos(angle + math.pi/2)), int(cy + r * math.sin(angle + math.pi/2)))
    pts3 = (int(cx + r * math.cos(angle + math.pi)), int(cy + r * math.sin(angle + math.pi)))
    pts4 = (int(cx + r * math.cos(angle + 3*math.pi/2)), int(cy + r * math.sin(angle + 3*math.pi/2)))
    
    cv2.circle(img, (cx, cy), r, color, 1, cv2.LINE_AA)
    
    # Arcos externos dependendo se está clicando ou não
    inner_r = 12 if is_clicking else 6
    cv2.circle(img, (cx, cy), inner_r, color, -1 if is_clicking else 1, cv2.LINE_AA)
    cv2.circle(img, (cx, cy), 2, (255, 255, 255), -1, cv2.LINE_AA)

    # Cruz
    length = 10
    cv2.line(img, (cx, cy - r - length), (cx, cy - r), color, 2, cv2.LINE_AA)
    cv2.line(img, (cx, cy + r), (cx, cy + r + length), color, 2, cv2.LINE_AA)
    cv2.line(img, (cx - r - length, cy), (cx - r, cy), color, 2, cv2.LINE_AA)
    cv2.line(img, (cx + r, cy), (cx + r + length, cy), color, 2, cv2.LINE_AA)

def draw_base_hud(img, gesture_name, fps, clicking, scrolling, detected_objects=[], hand_boxes=[]):
    h, w = img.shape[:2]
    overlay = img.copy()
    
    # Filtro azul/escuro cibernético por toda a tela (Scanline sutil)
    cv2.rectangle(overlay, (0, 0), (w, h), (20, 10, 0), -1)
    # Adicionando uma malha / grid fina de pontos
    for gy in range(0, h, 40):
        for gx in range(0, w, 40):
            cv2.circle(overlay, (gx, gy), 1, (40, 30, 20), -1)
    cv2.addWeighted(overlay, 0.15, img, 0.85, 0, img)

    # Painel superior
    overlay2 = img.copy()
    cv2.rectangle(overlay2, (0, 0), (w, 60), (10, 20, 15), -1)
    cv2.addWeighted(overlay2, 0.7, img, 0.3, 0, img)

    # Borda/Canto tipo Câmera de Vigilância (HUD Brackets)
    cl = 30 # corner length
    cv2.line(img, (20, 20), (20+cl, 20), (255, 255, 255), 2)
    cv2.line(img, (20, 20), (20, 20+cl), (255, 255, 255), 2)
    cv2.line(img, (w-20, 20), (w-20-cl, 20), (255, 255, 255), 2)
    cv2.line(img, (w-20, 20), (w-20, 20+cl), (255, 255, 255), 2)
    cv2.line(img, (20, h-20), (20+cl, h-20), (255, 255, 255), 2)
    cv2.line(img, (20, h-20), (20, h-20-cl), (255, 255, 255), 2)
    cv2.line(img, (w-20, h-20), (w-20-cl, h-20), (255, 255, 255), 2)
    cv2.line(img, (w-20, h-20), (w-20, h-20-cl), (255, 255, 255), 2)

    font  = cv2.FONT_HERSHEY_SIMPLEX
    
    cv2.putText(img, f"ATLAS SYSTEM LINK  |  FPS: {fps:3d}  |  RES: {w}x{h}", (50, 25), font, 0.5, (0, 255, 200), 1, cv2.LINE_AA)
    cv2.putText(img, f"GESTO: {gesture_name.upper()}", (50, 48), font, 0.5, (200, 220, 255), 1, cv2.LINE_AA)

    if clicking:
        cv2.putText(img, ">>> CLIQUE ATIVO <<<", (w - 250, 35), font, 0.5, (0, 100, 255), 2, cv2.LINE_AA)

    if scrolling:
        cv2.putText(img, ">>> SCROLLING <<<", (w - 250, 45), font, 0.5, (255, 140, 0), 2, cv2.LINE_AA)

    # Desenhar objetos
    for obj in detected_objects:
        cat = obj.categories[0]
        if cat.category_name == "person":
            continue
            
        bbox = obj.bounding_box
        x, y, bw, bh = int(bbox.origin_x), int(bbox.origin_y), int(bbox.width), int(bbox.height)
        
        in_hand = False
        for hx1, hy1, hx2, hy2 in hand_boxes:
            ix1, iy1 = max(x, hx1), max(y, hy1)
            ix2, iy2 = min(x + bw, hx2), min(y + bh, hy2)
            if ix1 < ix2 and iy1 < iy2:
                in_hand = True
                break
                
        if not in_hand:
            continue

        label = f"OBJ: {cat.category_name.upper()} [{int(cat.score * 100)}%]"
        
        # UI estilo target/caixa de identificação
        cv2.rectangle(img, (x, y), (x + bw, y + bh), (0, 255, 150), 1)
        # Cantos mais grossos para o objeto
        cv2.line(img, (x, y), (x+15, y), (0, 255, 150), 3)
        cv2.line(img, (x, y), (x, y+15), (0, 255, 150), 3)
        cv2.line(img, (x+bw, y+bh), (x+bw-15, y+bh), (0, 255, 150), 3)
        cv2.line(img, (x+bw, y+bh), (x+bw, y+bh-15), (0, 255, 150), 3)

        (tw, th), _ = cv2.getTextSize(label, font, 0.4, 1)
        cv2.rectangle(img, (x, y - th - 8), (x + tw + 10, y), (0, 255, 150), -1)
        cv2.putText(img, label, (x + 5, y - 4), font, 0.4, (0, 0, 0), 1, cv2.LINE_AA)

def draw_skeleton(img, lms, is_secondary=False):
    h, w = img.shape[:2]
    alpha = 0.38 if is_secondary else 1.0

    if is_secondary:
        palm_glow = (90, 90, 90)
        palm_core = (170, 170, 170)
        chain_colors = [(120, 120, 120)] * len(FINGER_CHAINS)
    else:
        palm_glow = (255, 210, 60)
        palm_core = (245, 255, 210)
        chain_colors = [color for _, color in FINGER_CHAINS]

    palm_pts = [landmark_px(lms[i], w, h) for i in PALM_ANCHORS]
    palm_np = np.array(palm_pts, dtype=np.int32)
    palm_overlay = img.copy()
    cv2.fillPoly(palm_overlay, [palm_np], palm_glow)
    cv2.polylines(palm_overlay, [palm_np], True, palm_core, 2, cv2.LINE_AA)
    cv2.addWeighted(palm_overlay, 0.14 * alpha, img, 1 - (0.14 * alpha), 0, img)

    for pass_width, pass_alpha in ((9, 0.16), (5, 0.24)):
        glow = img.copy()
        for chain_idx, (chain, _) in enumerate(FINGER_CHAINS):
            color = chain_colors[chain_idx]
            for a, b in zip(chain, chain[1:]):
                ax, ay = landmark_px(lms[a], w, h)
                bx, by = landmark_px(lms[b], w, h)
                cv2.line(glow, (ax, ay), (bx, by), color, pass_width, cv2.LINE_AA)
        for a, b in [(5, 9), (9, 13), (13, 17)]:
            ax, ay = landmark_px(lms[a], w, h)
            bx, by = landmark_px(lms[b], w, h)
            cv2.line(glow, (ax, ay), (bx, by), palm_glow, pass_width, cv2.LINE_AA)
        cv2.addWeighted(glow, pass_alpha * alpha, img, 1 - (pass_alpha * alpha), 0, img)

    for chain_idx, (chain, _) in enumerate(FINGER_CHAINS):
        color = chain_colors[chain_idx]
        for a, b in zip(chain, chain[1:]):
            ax, ay = landmark_px(lms[a], w, h)
            bx, by = landmark_px(lms[b], w, h)
            cv2.line(img, (ax, ay), (bx, by), color, 3 if not is_secondary else 2, cv2.LINE_AA)
            cv2.line(img, (ax, ay), (bx, by), palm_core, 1, cv2.LINE_AA)

    for i, lm in enumerate(lms):
        px, py = landmark_px(lm, w, h)
        color = palm_glow
        for chain_idx, (chain, _) in enumerate(FINGER_CHAINS):
            if i in chain:
                color = chain_colors[chain_idx]
                break
        radius = 6 if i in FINGER_TIPS else 5 if i in FINGER_MCPS or i == 0 else 3
        cv2.circle(img, (px, py), radius + 3, color, 1, cv2.LINE_AA)
        cv2.circle(img, (px, py), radius, color, -1, cv2.LINE_AA)
        cv2.circle(img, (px, py), max(2, radius // 2), (255, 255, 255), -1, cv2.LINE_AA)

    cx, cy = palm_center_px(lms, w, h)
    orb = img.copy()
    cv2.circle(orb, (cx, cy), 26, palm_glow, -1, cv2.LINE_AA)
    cv2.addWeighted(orb, 0.14 * alpha, img, 1 - (0.14 * alpha), 0, img)
    cv2.circle(img, (cx, cy), 15, palm_glow, 2, cv2.LINE_AA)
    cv2.circle(img, (cx, cy), 7, palm_core, -1, cv2.LINE_AA)

def draw_reticle(img, cx, cy, color, time_offset, is_clicking=False):
    pulse = 0.5 + 0.5 * math.sin(time_offset * 5.0)
    outer_r = int(24 + pulse * 5)
    inner_r = 12 if is_clicking else 8

    glow = img.copy()
    cv2.circle(glow, (cx, cy), outer_r + 16, color, -1, cv2.LINE_AA)
    cv2.addWeighted(glow, 0.18 if is_clicking else 0.10, img, 0.82 if is_clicking else 0.90, 0, img)
    cv2.circle(img, (cx, cy), outer_r, color, 2, cv2.LINE_AA)
    cv2.circle(img, (cx, cy), outer_r + 7, color, 1, cv2.LINE_AA)
    cv2.circle(img, (cx, cy), inner_r, color, -1 if is_clicking else 2, cv2.LINE_AA)
    cv2.circle(img, (cx, cy), 4, (255, 255, 255), -1, cv2.LINE_AA)

def draw_hud(img, gesture_name, fps, clicking, scrolling, detected_objects=[], hand_boxes=[]):
    draw_base_hud(img, gesture_name, fps, False, scrolling, detected_objects, hand_boxes)
    if clicking:
        h, w = img.shape[:2]
        font = cv2.FONT_HERSHEY_SIMPLEX
        cv2.putText(img, ">>> CLIQUE ATIVO <<<", (w - 250, 35), font, 0.5, (0, 100, 255), 2, cv2.LINE_AA)

def classify_gesture(lms):
    fu = fingers_up(lms)
    thumb, index, middle, ring, pinky = fu
    n_up = sum(fu)

    if is_pinching(lms):
        return "Pinça (Clique)", "pinch_click"

    if n_up == 0:
        return "Punho", "fist"
    if index and not middle and not ring and not pinky:
        return "Indicador (Scroll)", "scroll"
    if index and middle and not ring and not pinky:
        return "Dois Dedos (Dir.)", "right_click"
    if thumb and not index and not middle and not ring and not pinky:
        return "Polegar (Especial)", "thumb_up"
    if n_up >= 3:
        return "Mão Aberta (Mover)", "move"

    return "Incerto", "move"

# ─────────────────────────────────────────────
# HandTracker Principal
# ─────────────────────────────────────────────
class HandTracker:
    def __init__(self):
        self.running  = False
        self.thread   = None
        self.screen_w, self.screen_h = pyautogui.size()
        self.clicking  = False
        self.scrolling = False
        self.smooth = 0.35
        self.sx, self.sy = 0, 0
        self._gesture_buf = collections.deque(maxlen=6)

        base_dir = os.path.dirname(__file__)
        
        hand_model = os.path.join(base_dir, 'hand_landmarker.task')
        hand_options = vision.HandLandmarkerOptions(
            base_options=python.BaseOptions(model_asset_path=hand_model),
            num_hands=2,
            min_hand_detection_confidence=0.75,
            min_hand_presence_confidence=0.75,
            min_tracking_confidence=0.85,
        )
        self.hand_detector = vision.HandLandmarker.create_from_options(hand_options)
        
        obj_model = os.path.join(base_dir, 'efficientdet_lite0.tflite')
        self.obj_detector = None
        if os.path.exists(obj_model):
            obj_options = vision.ObjectDetectorOptions(
                base_options=python.BaseOptions(model_asset_path=obj_model),
                max_results=8,
                score_threshold=0.3
            )
            self.obj_detector = vision.ObjectDetector.create_from_options(obj_options)

        self._last_index_y = None
        self._right_click_done = False
        self.time_offset = 0.0

    def _vision_loop(self):
        # Aumentamos a resolução para 1280x720 (HD)
        cam = CameraReader(width=1280, height=720)
        time.sleep(0.8)
        
        # Permitir redimensionamento de janela (Fullscreen / Maximizar livremente)
        cv2.namedWindow('ATLAS Vision - Controle de PC', cv2.WINDOW_NORMAL)

        fps_counter = 0
        fps_timer   = time.time()
        fps_display = 0
        frame_idx   = 0
        
        last_objects = []

        while self.running:
            image = cam.get_frame()
            if image is None:
                time.sleep(0.005)
                continue

            h, w = image.shape[:2]
            display = image.copy()
            frame_idx += 1
            self.time_offset += 0.05

            rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            
            hand_result = self.hand_detector.detect(mp_image)
            
            # Objetos a cada 4 frames apenas para máxima taxa de FPS
            if self.obj_detector and frame_idx % 4 == 0:
                obj_result = self.obj_detector.detect(mp_image)
                last_objects = obj_result.detections

            gesture_name = "Nenhum alvo"
            is_clicking  = False
            is_scrolling = False
            hand_boxes   = []

            if hand_result.hand_landmarks:
                for lms in hand_result.hand_landmarks:
                    xs = [lm.x for lm in lms]
                    ys = [lm.y for lm in lms]
                    min_x, max_x = min(xs) * w - 30, max(xs) * w + 30
                    min_y, max_y = min(ys) * h - 30, max(ys) * h + 30
                    hand_boxes.append((min_x, min_y, max_x, max_y))

                main_idx = 0
                if len(hand_result.hand_landmarks) > 1:
                    for i, handedness in enumerate(hand_result.handedness):
                        if handedness[0].category_name == "Right":
                            main_idx = i
                            break
                            
                # CUBO 3D MÁGICO
                if len(hand_result.hand_landmarks) == 2:
                    lms0 = hand_result.hand_landmarks[0]
                    lms1 = hand_result.hand_landmarks[1]
                    if is_pinching(lms0) and is_pinching(lms1):
                        x1, y1 = landmark_px(lms0[8], w, h)
                        x2, y2 = landmark_px(lms1[8], w, h)
                        mid_x = (x1 + x2) // 2
                        mid_y = (y1 + y2) // 2
                        dist_px = math.hypot(x2 - x1, y2 - y1)
                        
                        angle_z = math.atan2(y2 - y1, x2 - x1)
                        draw_3d_cube(display, (mid_x, mid_y), dist_px * 0.35, 
                                     self.time_offset, self.time_offset * 1.5, angle_z)

                for idx, lms in enumerate(hand_result.hand_landmarks):
                    draw_skeleton(display, lms, is_secondary=(idx != main_idx))

                lms_main = hand_result.hand_landmarks[main_idx]
                gesture_name, action = classify_gesture(lms_main)
                self._gesture_buf.append(action)

                stable = max(set(self._gesture_buf), key=self._gesture_buf.count)
                
                palm_x, palm_y = palm_center_norm(lms_main)
                
                class PalmCenter:
                    def __init__(self, x, y):
                        self.x = x
                        self.y = y
                palm = PalmCenter(palm_x, palm_y)

                if stable in ("move", "scroll", "right_click", "fist", "thumb_up", "pinch_click"):
                    rx = max(0.0, min(1.0, (palm.x - 0.15) / 0.70))
                    ry = max(0.0, min(1.0, (palm.y - 0.10) / 0.80))
                    tx = int(rx * self.screen_w)
                    ty = int(ry * self.screen_h)

                    self.sx = int(self.sx * self.smooth + tx * (1 - self.smooth))
                    self.sy = int(self.sy * self.smooth + ty * (1 - self.smooth))
                    try:
                        pyautogui.moveTo(self.sx, self.sy, _pause=False)
                    except Exception:
                        pass

                is_pinching_now = (stable == "pinch_click")
                if is_pinching_now:
                    is_clicking = True
                    if not self.clicking:
                        pyautogui.mouseDown(_pause=False)
                        self.clicking = True
                else:
                    if self.clicking:
                        pyautogui.mouseUp(_pause=False)
                        self.clicking = False
                            
                if stable == "scroll":
                    is_scrolling = True
                    index_tip = lms_main[8]
                    if self._last_index_y is not None:
                        dy = (index_tip.y - self._last_index_y) * h
                        if abs(dy) > 3:
                            pyautogui.scroll(int(-dy * 0.5), _pause=False)
                    self._last_index_y = index_tip.y
                else:
                    self._last_index_y = None

                if stable == "right_click":
                    if not self._right_click_done:
                        pyautogui.rightClick(_pause=False)
                        self._right_click_done = True
                else:
                    self._right_click_done = False

                cx, cy = landmark_px(palm, w, h)
                # Renderiza a "mira" animada de uso profissional
                reticle_color = (0, 50, 255) if is_clicking else (0, 255, 200)
                draw_reticle(display, cx, cy, reticle_color, self.time_offset, is_clicking=is_clicking)
                
            else:
                if self.clicking:
                    pyautogui.mouseUp(_pause=False)
                    self.clicking = False
                self._gesture_buf.clear()
                self._last_index_y   = None
                self._right_click_done = False

            fps_counter += 1
            if time.time() - fps_timer >= 1.0:
                fps_display = fps_counter
                fps_counter = 0
                fps_timer   = time.time()

            draw_hud(display, gesture_name, fps_display, is_clicking, is_scrolling, last_objects, hand_boxes)

            cv2.imshow('ATLAS Vision - Controle de PC', display)
            cv2.waitKey(1)

        cam.release()
        cv2.destroyAllWindows()
        logging.info("Visão do ATLAS desativada.")

    def start(self):
        if self.running:
            return False
        self.running = True
        self.thread  = threading.Thread(target=self._vision_loop, daemon=True)
        self.thread.start()
        logging.info("Visão do ATLAS ativada.")
        return True

    def stop(self):
        if not self.running:
            return False
        self.running = False
        if self.clicking:
            pyautogui.mouseUp(_pause=False)
            self.clicking = False
        if self.thread:
            self.thread.join(timeout=3)
        return True

    def is_running(self):
        return self.running


tracker = None

def get_tracker():
    global tracker
    if tracker is None:
        tracker = HandTracker()
    return tracker

def start_vision():
    return get_tracker().start()

def stop_vision():
    return get_tracker().stop()

def is_vision_active():
    return get_tracker().is_running()
