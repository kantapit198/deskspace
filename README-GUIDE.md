# คู่มือโครงสร้างปลั๊กอินระบบออกแบบโต๊ะสั่งตัด (DeskSpace Configurator)

ระบบนี้ได้รับการแปลงจาก Shortcode Snippet แบบไฟล์เดียวมาเป็นปลั๊กอินมาตรฐานของ WordPress โดยแบ่งกลุ่มการทำงานแยกเป็นไฟล์ต่าง ๆ เพื่อให้ง่ายต่อการตรวจสอบ แก้ไขข้อผิดพลาด และป้องกันปัญหาโค้ดชนกันหรือประกาศซ้ำ

---

## 📂 โครงสร้างโฟลเดอร์ของปลั๊กอิน (Directory Structure)

```text
deskspace-configurator/
├── deskspace-configurator.php     # ไฟล์หลักของปลั๊กอิน (Bootstrap & Enqueue Assets)
├── README-GUIDE.md                # คู่มือโครงสร้างไฟล์และฟังก์ชันการทำงาน (ไฟล์นี้)
├── includes/
│   ├── ajax-handlers.php          # จัดการระบบหลังบ้านทั้งหมด (AJAX Actions & API Fetch)
│   ├── shortcode.php              # ทะเบียน Shortcode และเค้าโครง HTML ของระบบ Configurator
│   ├── admin-dashboard.php        # ส่วนจัดการแผงควบคุมระบบแอดมินและการซิงค์ข้อมูล Google Sheet
│   └── log-dashboard.php          # แผงตรวจสอบ Audit Logs และการ Rollback ข้อมูล
└── assets/
    ├── css/
    │   └── configurator.css       # สไตล์ชีตหลักการแสดงผลหน้าบ้าน (UI / Layout)
    └── js/
        ├── configurator-core.js   # การประกาศตัวแปรเริ่มต้น, โครงสร้างเก็บข้อมูล, และ API Cache
        ├── configurator-drawing.js# ส่วนประมวลผลการวาดภาพบน Canvas (2D และ 3D Perspective)
        ├── configurator-ui.js     # การตอบสนองของอินเทอร์เฟซผู้ใช้, การคำนวณ Gaps, และตะกร้าตัวเลือกเสริม
        ├── configurator-ai.js     # ฟังก์ชันประมวลผลการสร้างรูปภาพผ่าน AI Generation Webhook
        └── configurator-misc.js   # ทราฟฟิกข้อมูลลูกค้า, การล็อกอินของสมาชิก (dsAuthModal), และการแปลภาษา
```

---

## 🛠️ รายละเอียดฟังก์ชันหลักในแต่ละไฟล์

### 1. `deskspace-configurator.php`
ไฟล์เริ่มต้นของปลั๊กอิน ทำหน้าที่ประกาศข้อมูลปลั๊กอินในระบบ WordPress และลงทะเบียนสไตล์ชีตและสคริปต์ JavaScript ทั้งหมดพร้อมจัดการระบบ Dependency เพื่อให้ JavaScript โหลดในลำดับที่ถูกต้องตามลำดับความสัมพันธ์

### 2. `includes/ajax-handlers.php`
ศูนย์กลางการทำงานเบื้องหลัง (Backend Logic) ผ่าน AJAX Actions:
* **`dpb_handle_send_proposal_v5()`** - ประมวลผลและส่งเมลขอใบเสนอราคา / สอบถามข้อมูล ของลูกค้าไปยัง Admin และ CC หาตัวลูกค้า พร้อมสร้างระบบเขียนบันทึกไฟล์ Logs (`logs.jsonl`)
* **`deskspace_proposal_builder_fetch_meta()`** - ติดต่อ API Google Sheets เพื่อดึงข้อมูล Metadata ล่าสุดของ สีโต๊ะ, ขาโต๊ะ, และออปชันเสริม พร้อมสร้างระบบ Cache (Transient) 15 นาที
* **`ds_handle_ajax_login() / ds_handle_ajax_register() / ds_handle_ajax_forgot() / ds_handle_ajax_logout()`** - ระบบสมัครสมาชิก เข้าสู่ระบบ ลืมรหัสผ่าน และออกจากระบบของลูกค้า ผ่านระบบ AJAX ร่วมกับระบบ Nonce ความปลอดภัย
* **`ds_enqueue_auth_scripts()`** - ผูกตัวแปรความปลอดภัย Nonce และข้อมูลล็อกอินของผู้ใช้จากฝั่ง PHP ไปเป็นตัวแปร JavaScript Global (`ds_auth_vars`)
* **`ds_image_proxy_handler()`** - ระบบสะพานส่งรูปภาพข้ามเซิร์ฟเวอร์ (Image Proxy) เพื่อทำหน้าที่ดาวน์โหลดไฟล์ภาพจากโดเมนหลักและส่งกลับมาพร้อม Access-Control-Allow-Origin: * เพื่อแก้ปัญหา CORS Blockade บน Localhost/Ngrok

### 3. `includes/shortcode.php`
ควบคุม Shortcode หลัก `[deskspace_proposal_builder10]`:
* โหลดเค้าโครงหน้าหลัก HTML (เช่น ส่วน Canvas, แผงควบคุมตั้งค่าโต๊ะ, ฟอร์มติดต่อกลับลูกค้า, ป๊อปอัพตัวเลือกเสริม)
* ดึงข้อมูล Nonce และตรวจสอบสิทธิ์ของผู้ใช้เพื่อเปิดใช้งาน **Admin Mode** สำหรับผู้ดูแลระบบ
* สั่งรีดและโหลดไฟล์ Assets (CSS/JS) ทั้งหมดลงในหน้านั้น ๆ โดยเฉพาะ (ไม่โหลดในหน้าที่ไม่มี Configurator ป้องกันเว็บโหลดช้า)

---

## 🔬 ถอดรหัสโครงสร้างฟังก์ชันและวิศวกรรมซอฟต์แวร์ (Detailed API & Functions)

### 1. หมวดหมู่ตัวแปรและ Asset โครงสร้างโต๊ะ/ขาโต๊ะ (Data & Assets)
* **`LEG_ASSETS` / `SINGLE_LEG_ASSETS` / `LEG_ASSETS_L2` / `LEG_ASSETS_L3` / `SINGLE_MOTOR_ASSETS` / `WORKSPACE_ASSETS` / `MANUAL_DESK_ASSETS` / `LEG_3D_ASSETS`**
  * *วัตถุประสงค์*: เก็บโครงสร้าง URL รูปภาพขาโต๊ะรุ่นต่าง ๆ ทั้งแบบ 2D และแบบแยกทิศทางซ้าย-ขวาสำหรับมุมมอง 3D Perspective เพื่อเป็นแหล่งข้อมูลให้ฟังก์ชันวาดดึงพิกัดไปแปลงผ่าน Image Proxy
* **`LEG_DIMS_L2_CM` / `LEG_DIMS_L3_LEFT_CM` / `LEG_DIMS_L3_RIGHT_CM` / `LEG_DIMS_L3_TOP_V3_CM` / `LEG_DIMS_MANUAL_CM` / `LEG_DIMS_SINGLE_MOTOR_CM` / `LEG_DIMS_WORKSPACE_CM`**
  * *วัตถุประสงค์*: กำหนดขนาดจริงของโครงเหล็กขาโต๊ะแต่ละรุ่นในหน่วยเซนติเมตร สำหรับใช้ประเมินระยะชนกัน (Overlap) และควบคุมขอบเขตระยะปลอดภัยไม่ให้เจาะล้นแผ่นไม้จริง
* **`L_ALLOWED_LEG_KEYS`**
  * *วัตถุประสงค์*: กำหนดลิสต์รุ่นขาที่อนุญาตให้ใช้กับโต๊ะตัว L (L-Shape) ได้ ป้องกันผู้ใช้เลือกสเปคที่ประกอบไม่ได้จริง

### 2. สมองการเรนเดอร์ภาพบน Canvas (Graphics & 2D/3D Render Engine)
* **`window.drawDesk3D`**
  * *วัตถุประสงค์*: คำนวณฉายพิกัด 3D ลงบนหน้าจอ 2D (Perspective Projection) เพื่อเรนเดอร์ภาพโต๊ะสั่งตัดแบบ 3 มิติในทุกมุมมอง
* **`window.DPB_drawCuboid3Faces`**
  * *วัตถุประสงค์*: วาดกล่อง 3 มิติโดยแบ่งการเรนเดอร์ออกเป็น 3 ด้าน (บน, เฉียง, ข้าง) เพื่อเลียนแบบความหนาขอบไม้ของหน้าท็อปโต๊ะ
* **`window.drawOptionsIn3D`**
  * *วัตถุประสงค์*: ฉายพิกัดและวาดรูปออปชันเสริม (เช่น รูร้อยสายไฟ) ให้บิดเอียงตามแนวราบของหน้าโต๊ะ 3D
* **`window.DPB_drawTexturedQuad`**
  * *วัตถุประสงค์*: วาดพื้นผิวสี่เหลี่ยมบิดตามพิกัด 3D โดยการขึงปิดผิวรูปภาพลายไม้จริง (Texture mapping) ลงบนผิวโต๊ะ
* **`draw`**
  * *วัตถุประสงค์*: ลูปหลักการเรนเดอร์ (Main Render Loop) ที่จะคอยล้างหน้าจอและสั่งวาดโต๊ะใหม่เมื่อมีการลากสไลเดอร์ปรับขนาด
* **`drawRectAt` / `drawLDeskAt`**
  * *วัตถุประสงค์*: วาดขอบเขตแผ่นท็อปไม้รูปทรงสี่เหลี่ยมผืนผ้า และทรงตัว L พร้อมแต่งขอบโค้งมนตามหน่วยวัดพิกเซล
* **`window.createDynamicDeskPath`**
  * *วัตถุประสงค์*: คำนวณเส้นพิกัดรอบโต๊ะ (SVG / Canvas Path) โดยการหลบมุมโค้งมนตามสไตล์ที่ผู้ใช้เลือก เพื่อนำไปใช้เจาะรูเจาะตำแหน่งและวาดเงา
* **`clipRoundedRect` / `roundedPathNoClamp`**
  * *วัตถุประสงค์*: ตัดขอบรูปภาพลายไม้หรือขาโต๊ะที่ล้นขอบ ให้โค้งมนเข้ารูปตามค่าความโค้งมนของมุมท็อปโต๊ะ
* **`labelCornerR` / `drawCornerArrow` / `drawCornerArrowFromCorner`**
  * *วัตถุประสงค์*: วาดเส้นลูกศรบอกองศาและระยะความโค้ง (Radius) บริเวณมุมโต๊ะเพื่อเป็นตัวนำสายตา
* **`drawInnerGuide`**
  * *วัตถุประสงค์*: วาดเส้นบอกขอบเขตจำลองของโครงสร้างขาโต๊ะและระยะเจาะปลอดภัย ป้องกันผู้ใช้วางจุดเจาะรูทับตำแหน่งคานเหล็กด้านล่าง
* **`drawCustomDeskLegsLayer` / `drawL3LegsLayer` / `drawL2LegsLayer` / `drawManualDeskLegsLayer` / `drawSingleMotorLegsLayer` / `drawWorkSpaceLegsLayer` / `drawSingleLegLayer`**
  * *วัตถุประสงค์*: แยกหน้าที่การคำนวณและวาดขาโต๊ะแต่ละชนิด เพื่อเขียนแอนิเมชันยกขาสูง-ต่ำได้อย่างอิสระ
* **`window.drawLegsForScan`**
  * *วัตถุประสงค์*: วาดเฉพาะขาโต๊ะชั่วคราวเพื่อตรวจจับจุดพิกัดในระบบ Pixel Collision และปรับเฉดสีของเส้นมิติระยะโดยอัตโนมัติ
* **`window.draw2DDebugRuler`**
  * *วัตถุประสงค์*: วาดแผงไม้บรรทัดบอกขนาดกว้างยาว (หน่วย cm) รอบทิศทางของ Canvas
* **`drawInfoOverlayOnDesk` / `dpb_computeInfoOverlayXY`**
  * *วัตถุประสงค์*: วาดข้อความระบุระยะห่างภายในหน้าโต๊ะ เช่น ระยะห่างระหว่างขาซ้ายถึงขวา เพื่อคำนวณพื้นที่จัดวางตู้ลิ้นชักใต้โต๊ะ
* **`startDimPulse` / `stopDimPulse` / `window._dpbDimPulse`**
  * *วัตถุประสงค์*: ควบคุมการกระพริบอนิเมชันของเส้นวัดขนาดเมื่อผู้ใช้ปรับช่องขนาดนั้นๆ เพื่อส่งสัญญาณเชิงตอบโต้ (Visual Feedback)

### 3. ระบบสมองกลคำนวณระยะและป้องกันการชนกันของเหล็ก (Conflict Checkers)
* **`Math3DHelper`**
  * *วัตถุประสงค์*: คำนวณทางคณิตศาสตร์ 3 มิติสำหรับการหมุนและวางมุมกล้อง Perspective
* **`_pointRectDist` / `_dist` / `_clamp`**
  * *วัตถุประสงค์*: คำนวณระยะห่างระหว่างจุดหนึ่งไปยังวัตถุสี่เหลี่ยม และบีบพิกัดตำแหน่งเจาะไม่ให้ล้นออกนอกระนาบแผ่นไม้
* **`pxToCm` / `cmToPx` / `cmOverToInt` / `l3_pxToCm` / `l3_cmToPx`**
  * *วัตถุประสงค์*: แปลงอัตราส่วนระหว่างหน่วยบนจอบราวเซอร์ (Pixels) และหน่วยวัดจริงทางอุตสาหกรรม (Centimeters) เพื่อความแม่นยำในการสั่งผลิต
* **`_checkOverlap_Custom`**
  * *วัตถุประสงค์*: ตรวจจับการชนกันของคานเหล็กขาโต๊ะซ้าย-ขวา เมื่อผู้ใช้ปรับหดความยาวโต๊ะต่ำสุด
* **`computeLegLayoutL2Rect1` / `computeLegLayoutL2Rect1_V2` / `computeLegLayoutL2_V2` / `l2_legOverflowsRect2` / `l2_overflowInfo` / `l2_clamp` / `l2_needsV2` / `_checkOverlap_L2`**
  * *วัตถุประสงค์*: ประมวลตำแหน่งและทิศทางของขาโต๊ะรูปตัว L แบบ 2 มอเตอร์ (L2) ป้องกันไม่ให้แผ่นขาส่วนยื่นโผล่ออกนอกโครงร่าง
* **`computeLegLayoutL3Rects` / `computeLegLayoutL3Rects_V2` / `computeLegLayoutL3Rects_V3` / `computeLegLayoutL3Rects_SMART` / `l3_rectsOverlap` / `l3_layoutHasConflict`**
  * *วัตถุประสงค์*: คํานวณจุดพิกัดขาสามข้างของโต๊ะตัว L ขนาดใหญ่ 3 มอเตอร์ (L3) ให้มีการเฉลี่ยศูนย์ถ่วงของโครงร่างได้อย่างปลอดภัยและถูกหลักกลศาสตร์
* **`l3_drawDebugRect` / `l3_drawDebugCropX` / `l3_drawDebugCropY` / `l2_dbgHLine` / `l2_dbgRect`**
  * *วัตถุประสงค์*: วาดกล่องพิกัดดีบัก (เมื่อรันบน debug mode) เพื่อให้นักพัฒนาทดสอบตรวจจับพิกัดชนกันบนจอได้ทันที

### 4. ระบบวางพิกัดและเจาะรูออปชัน (Interactive Placement Engine)
* **`ZONE_DEF` / `ZONE_LIMIT` / `ZONE_DIVIDERS`**
  * *วัตถุประสงค์*: กำหนดพื้นที่เจาะปลอดภัย (เช่น ขอบบน-หลังซ้าย, ขอบบน-หลังขวา) เพื่อป้องกันการเจาะชนคานโครงเหล็กโต๊ะตัวจริง
* **`validatePlacement`**
  * *วัตถุประสงค์*: ประเมินความถูกต้องของจุดพิกัดที่ลูกค้าแตะเลือกว่าซ้อนทับกันหรือไม่ก่อนกดบันทึก
* **`pickZone`**
  * *วัตถุประสงค์*: จับทิศทางการคลิกของเมาส์หรือการแตะสัมผัสลงบนโซนหน้าโต๊ะเพื่อส่งค่าไปบันทึก
* **`openPP` / `closePP` / `confirmPiece`**
  * *วัตถุประสงค์*: เปิด-ปิด และยืนยันการตั้งค่าตำแหน่งเจาะออปชันทีละชิ้นภายในหน้าต่างจำลองการเจาะ (Placement Panel Popup)
* **`isPlacementReady`**
  * *วัตถุประสงค์*: บล็อกปุ่มกดขอใบเสนอราคาหากมีอุปกรณ์บางรายการในตะกร้าที่ยังไม่ได้รับการระบุตำแหน่งเจาะแผ่นท็อปไม้

### 5. ระบบลายน้ำแบรนด์ (Watermark Control)
* **`DPB_WM` / `window.DPB_WM`**
  * *วัตถุประสงค์*: ออบเจกต์เก็บข้อมูลความโปร่งแสง, สัดส่วนย่อขยาย, และ URL ภาพโลโก้ของลายน้ำ
* **`DPB__loadWMImage` / `DPB_setWatermarkAnchor` / `DPB_setWatermarkOptions` / `DPB_toggleWatermark` / `DPB_debugWatermark`**
  * *วัตถุประสงค์*: โหลดและล็อกลายน้ำไว้บริเวณกึ่งกลางของหน้าโต๊ะ ทั้งยังคำนวณการหมุนตามระนาบ 3D ของท็อปโต๊ะ
* **`DPB_applyWatermarkAutoColor`**
  * *วัตถุประสงค์*: วิเคราะห์สีของหน้าโต๊ะสั่งตัดเพื่อสลับสีโลโก้ลายน้ำให้อัตโนมัติ (โลโก้สีขาวบนท็อปสีเข้ม, โลโก้สีดำบนท็อปสีอ่อน)
* **`DPB_drawBrandWatermark_OnTop`**
  * *วัตถุประสงค์*: วาดลายน้ำแบรนด์ขั้นสุดท้ายประทับลงบนระนาบหน้าโต๊ะก่อนที่บราวเซอร์จะบันทึกรูปภาพเพื่อส่งเข้าเมลแอดมิน

### 6. ระบบสลับโหมดควบคุมและประสานข้อมูล (UI, State & Configuration)
* **`window.state` / `ensureState`**
  * *วัตถุประสงค์*: ออบเจกต์เก็บค่าสเปคจริงปัจจุบันทั้งหมดของโต๊ะและออปชันในหน้าจอ เพื่อส่งต่อไปยังสคริปต์อื่นแบบ Single Source of Truth
* **`window.DPB_TYPE_DEFAULTS` / `getTypeDefaults`**
  * *วัตถุประสงค์*: ตารางสเปคเริ่มต้นที่ได้รับการอนุมัติ (เช่น ขนาดเริ่มต้นของแต่ละรุ่น) เพื่อรีเซ็ตค่าสไลเดอร์ให้อัตโนมัติเวลาเปลี่ยนประเภทโต๊ะ
* **`openCart` / `closeCart` / `setCartEmptyState` / `refreshAllCartForms` / `refreshAllCartPlacementForms`**
  * *วัตถุประสงค์*: จัดการสไลด์เปิด-ปิดตะกร้าสินค้า ปิดล็อกบอดี้หน้าเว็บ และอัปเดตแบบฟอร์มการเจาะรูของรายการออปชันเสริมแต่ละชิ้น
* **`updateCartBadge` / `totalSelectedCount`**
  * *วัตถุประสงค์*: ตรวจนับผลรวมรายการออปชันเสริมในตะกร้าเพื่อไปแสดงผลยอดตัวเลขสีแดงบนปุ่ม
* **`applyPackToCard` / `rebuildPosSelectInCard` / `updateCartThumbVariant` / `syncCartItemState`**
  * *วัตถุประสงค์*: อัปเดตรูปแบบตัวเลือกย่อยของออปชัน การจับคู่ข้อมูลพิกัด (แนวตั้ง/แนวนอน/ระยะห่าง) และรูปขนาดย่อของการ์ดในตะกร้า
* **`setMobileCartHeightToCanvasBottom` / `requestMobileCartHeightUpdate` / `setMobileThemeHeightToCanvasBottom` / `requestMobileThemeHeightUpdate`**
  * *วัตถุประสงค์*: ตรวจวัดและบีบความสูงของแถบหน้าจอออปชันและแถบธีมสีบนหน้าจอมือถือให้อยู่ใต้พื้นที่ Canvas ของภาพโต๊ะเสมอ ช่วยให้ลูกค้ามองเห็นการเปลี่ยนแปลงบน Canvas ได้ทันทีโดยไม่ถูกแผงควบคุมมาบัง
* **`enableDragClose`**
  * *วัตถุประสงค์*: ตรวจวัดระยะสัมผัสบนมือถือเพื่อรองรับการใช้นิ้วปัดหน้าต่างลงเพื่อสั่งปิดเมนู (Swipe down to close)
* **`validateInputs` / `validateRadiusConstraints`**
  * *วัตถุประสงค์*: ประเมินความถูกต้องของความยาว ความกว้าง และรัศมีขอบมุมโต๊ะ ก่อนบันทึกสเปค
* **`DSLOG_Deskspace_collectAndSave`**
  * *วัตถุประสงค์*: ควบคุมกระบวนการรวมสเปคสถิติตั้งค่าและพฤติกรรมของโต๊ะเพื่อเขียนบันทึกลงสู่ไฟล์ Log ทันทีที่ส่งเมลใบเสนอราคาสำเร็จ
