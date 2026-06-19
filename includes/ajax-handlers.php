<?php
if (!defined('ABSPATH')) {
    exit;
}

// 1. Send Proposal Handler
add_action('wp_ajax_dpb_send_proposal_v5',        'dpb_handle_send_proposal_v5');
add_action('wp_ajax_nopriv_dpb_send_proposal_v5', 'dpb_handle_send_proposal_v5');

function dpb_handle_send_proposal_v5() {
    check_ajax_referer('dpb_security_nonce_v4', 'nonce');

    $intent   = sanitize_text_field($_POST['intent']   ?? 'quote');   // 'quote' | 'inquiry'
    $info     = $_POST['contact_info'] ?? [];
    $name     = sanitize_text_field($info['name']    ?? '-');
    $email    = sanitize_email($info['email']        ?? '-');
    $tel      = sanitize_text_field($info['tel']     ?? '-');
    $line_id  = sanitize_text_field($info['line_id'] ?? '-');
    $question = sanitize_textarea_field($_POST['question'] ?? '');

    $image_data  = $_POST['image_data'] ?? '';
    $attachments = [];
    $temp_files  = [];

    if (!empty($image_data)) {
        $parts = explode(";base64,", $image_data);
        if (count($parts) === 2) {
            $decoded = base64_decode(str_replace(' ', '+', $parts[1]));
            if ($decoded !== false) {
                $finfo     = new finfo(FILEINFO_MIME_TYPE);
                $real_mime = $finfo->buffer($decoded);
                $allowed   = ['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'];
                if (array_key_exists($real_mime, $allowed)) {
                    $upload  = wp_upload_dir();
                    $fname   = 'proposal_' . time() . '_' . rand(100,999) . '.' . $allowed[$real_mime];
                    $fpath   = $upload['path'] . '/' . $fname;
                    file_put_contents($fpath, $decoded);
                    $attachments[] = $fpath;
                    $temp_files[]  = $fpath;
                }
            }
        }
    }

    $summary_data = json_decode(stripslashes($_POST['summary_data'] ?? '{}'), true);

    if (!function_exists('dpb_build_table_v5')) {
        function dpb_build_table_v5($data, $title) {
            if (empty($data)) return '';
            $html  = "<div style='margin-bottom:20px;'>";
            $html .= "<h3 style='color:#b69652;border-bottom:2px solid #b69652;padding-bottom:5px;margin:0 0 10px;font-size:16px;font-weight: 500;letter-spacing: 0.8px;'>$title</h3>";
            $html .= "<table style='width:100%;border-collapse:collapse;font-size:14px;color:#333;'>";
            foreach ($data as $k => $v) {
                if (is_array($v)) continue;
                $html .= "<tr><td style='padding:8px;border-bottom:1px solid #eee;width:40%;color:#666;'>".esc_html($k)."</td>";
                $html .= "<td style='padding:8px;border-bottom:1px solid #eee;font-weight:600;'>".esc_html($v)."</td></tr>";
            }
            $html .= "</table></div>";
            return $html;
        }
    }

    $tbl_spec = dpb_build_table_v5($summary_data['สเปคโต๊ะ'] ?? [], 'ข้อมูลสเปคโต๊ะ');

    $opts_html = '';
    if (!empty($summary_data['รายการ_Options'])) {
        $opts_html .= "<div style='margin-bottom:20px;'><h3 style='color:#b69652;border-bottom:2px solid #b69652;padding-bottom:5px;margin:0 0 10px;font-size:16px; font-weight: 500;    letter-spacing: 0.8px;'>รายการ Options เสริม</h3>";
        $opts_html .= "<table style='width:100%;border-collapse:collapse;font-size:14px;color:#333;'>";
        $opts_html .= "<tr style='background:#f5f5f5;'><th style='padding:8px;text-align:left;'>รายการ</th><th style='padding:8px;text-align:center;'>จำนวน</th></tr>";
        foreach ($summary_data['รายการ_Options'] as $opt) {
            $opts_html .= "<tr><td style='padding:8px;border-bottom:1px solid #eee;'>".esc_html($opt['รายการ']??'')."</td>";
            $opts_html .= "<td style='padding:8px;border-bottom:1px solid #eee;text-align:center;font-weight:bold;'>".esc_html($opt['จำนวน']??'')."</td></tr>";
        }
        $opts_html .= "</table></div>";
    }

    $name_lower = mb_strtolower($name, 'UTF-8');
    $corp_keywords = [
        'บริษัท', 'บจก.', 'บจก', 'บจ.', 'บจ', 'บมจ.', 'บมจ',
        'ห้างหุ้นส่วนจำกัด', 'ห้างหุ้นส่วนสามัญ', 'หจก.', 'หจก', 'หสน.', 'หสน',
        'มูลนิธิ', 'สมาคม', 'สหกรณ์',
        'มหาวิทยาลัย', 'วิทยาลัย', 'โรงเรียน',
        'โรงพยาบาล', 'รพ.',
        'องค์การ', 'องค์กร',
        'กระทรวง', 'กรม', 'สำนักงาน',
    ];

    $person_prefixes = [
        'นาย', 'นาง', 'นางสาว', 'น.ส.',
        'ดร.', 'ศ.', 'รศ.', 'ผศ.',
        'นพ.', 'ทพ.', 'ภญ.', 'ภก.',
        'คุณ',
    ];

    $is_corporate = false;
    foreach ($corp_keywords as $kw) {
        if (mb_strpos($name_lower, mb_strtolower($kw, 'UTF-8')) !== false) {
            $is_corporate = true;
            break;
        }
    }

    $has_person_prefix = false;
    foreach ($person_prefixes as $prefix) {
        if (mb_strpos($name_lower, mb_strtolower($prefix, 'UTF-8')) !== false) {
            $has_person_prefix = true;
            break;
        }
    }

    if ($is_corporate) {
        $display_name  = $name;
        $contact_label = 'บริษัท / องค์กร';
    } elseif ($has_person_prefix) {
        $display_name  = $name;
        $contact_label = 'ชื่อ';
    } else {
        $display_name  = 'คุณ ' . $name;
        $contact_label = 'ชื่อ';
    }

    $contact_block = "
    <div style='background:#f9f9f9;padding:15px;border-left:4px solid #b69652;margin-bottom:25px;border-radius:0 6px 6px 0;'>
        <p style='margin:5px 0;font-size:14px;'><strong style='color:#666;'>{$contact_label}:</strong> {$name}</p>
        <p style='margin:5px 0;font-size:14px;'><strong style='color:#666;'>อีเมล:</strong> $email</p>
        <p style='margin:5px 0;font-size:14px;'><strong style='color:#666;'>เบอร์โทร:</strong> $tel</p>
        <p style='margin:5px 0;font-size:14px;'><strong style='color:#666;'>Line ID:</strong> $line_id</p>
    </div>";

    $email_wrap_open = "
    <div style='font-family:Prompt, sans-serif;max-width:720px;margin:0 auto;border:1px solid #e0e0e0;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);'>
        <div style='background:#fff;padding:24px;text-align:center;border-bottom:3px solid #b69652;'>
            <h1 style='font-family:Prompt, sans-serif;color:#b69652;margin:0;font-size:36px;letter-spacing:0.1em;text-transform:uppercase;'>DESKSPACE</h1>
        </div>
        <div style='padding:30px;'>";
    $email_wrap_close = "
            <hr style='border:0;border-top:1px solid #eee;margin:30px 0;'>
            <p style='text-align:center;color:#aaa;font-size:11px;letter-spacing:0.05em;'>ส่งจากระบบ DeskSpace Configurator</p>
        </div>
    </div>";

    $to_admin       = 'team@boxbillion.com';
    $from_system    = 'Website Deskspace Configurator <deskspaceth@gmail.com>';
    $headers_base   = ['Content-Type: text/html; charset=UTF-8', "From: $from_system", "Reply-To: $name <$email>"];

    if ($intent === 'quote') {
        $safe_question = esc_html($question);
        $subject_admin = "ขอใบเสนอราคา (Customized Desk): {$display_name}";

        $extra_note_html = '';
        if (!empty($safe_question)) {
            $extra_note_html = "
            <div style='margin-bottom:25px;'>
                <h3 style='color: #b3261e;letter-spacing: 0.8px;font-weight: 500;border-bottom: 2px solid #b3261e;padding-bottom: 5px;margin: 0 0 10px;font-size: 16px;'>ข้อความเพิ่มเติมจากลูกค้า</h3>
                <div style='background: #c34a4a;letter-spacing: 0.8px;border: 0px solid #ff5d5d;border-radius: 8px;padding: 16px;font-size: 14px;line-height: 1.7;color: #ffffff;'>
                    $safe_question
                </div>
            </div>";
        }

        $message_admin = $email_wrap_open . "
            <h2 style='color:#1a1714;font-size:24px;margin:0 0 20px;'>
                ลูกค้าขอใบเสนอราคา (Website DeskSpace Configurator)
            </h2>
            $contact_block
            $extra_note_html
            $tbl_spec
            $opts_html"
        . $email_wrap_close;

        $sent_admin = wp_mail($to_admin, $subject_admin, $message_admin, $headers_base, $attachments);

        if ($email && $email !== '-') {
            $message_customer = $email_wrap_open . "
                <div style='text-align:center;padding:10px 0 30px;'>
                    <h2 style='color:#333;font-size:20px;margin-bottom:12px;'>Thank You For Choosing Us</h2>
                    <p style='color:#666;font-size:15px;line-height:1.7;'>
                        ทาง Deskspace ได้รับคำขอใบเสนอราคาจาก <strong>{$display_name}</strong> เรียบร้อยแล้ว<br>
                        ทีมงานจะประเมินราคาและติดต่อกลับทาง <strong>Line หรืออีเมล</strong> โดยเร็วที่สุดค่ะ
                    </p>
                    <p style='color:#999;font-size:13px;margin-top:16px;line-height:1.6;'>
                        We've received your quotation request and will get back<br>to you via Line or Email shortly.
                    </p>
                </div>
                <div style='background:#f9f7f3;border-radius:8px;padding:15px;text-align:center;font-size:12px;color:#999;'>
                    หากมีข้อสงสัย: team@boxbillion.com | Line: @deskspace
                </div>"
            . $email_wrap_close;

            wp_mail($email, 'Deskspace — เราได้รับคำขอใบเสนอราคาของคุณแล้ว',
                $message_customer,
                ['Content-Type: text/html; charset=UTF-8', 'From: Deskspace <deskspaceth@gmail.com>']
            );
        }
    } else {
        $safe_question = esc_html($question);
        $subject_admin = "สอบถามข้อมูลเพิ่มเติม: {$display_name}";

        $message_admin = $email_wrap_open . "
            <h2 style='color:#1a1714;font-size: 24px;font-weight: 500;margin:0 0 20px'>
                ลูกค้าสอบถามข้อมูลแบบโต๊ะ Customized Desk
            </h2>
            <div style='margin-bottom:20px;'>
                <h3 style='color:#b69652;border-bottom:2px solid #b69652;padding-bottom:5px;margin:0 0 10px;font-size:16px;font-weight: 500; letter-spacing: 0.8px;'>ข้อมูลติดต่อกลับ</h3>
                $contact_block
            </div>
            <div style='margin-bottom:25px;'>
                <h3 style='color:#b69652;border-bottom:2px solid #b69652;padding-bottom:5px;margin:0 0 10px;font-size:16px;font-weight: 500; letter-spacing: 0.8px;'>ข้อความจากลูกค้า</h3>
                <div style='background:#fffdf8;border:1px solid #e8d8b0;border-radius:8px;padding:16px;font-size:14px;line-height:1.7;color:#333;'>
                    $safe_question
                </div>
            </div>
            $tbl_spec
            $opts_html"
        . $email_wrap_close;

        $sent_admin = wp_mail($to_admin, $subject_admin, $message_admin, $headers_base, $attachments);

        if ($email && $email !== '-') {
            $message_customer = $email_wrap_open . "
                <div style='text-align:center;padding:10px 0 30px;'>
                    <h2 style='color:#333;font-size:20px;margin-bottom:12px;'>ได้รับข้อความของคุณแล้ว</h2>
                    <p style='color:#666;font-size:15px;line-height:1.7;'>
                        ทีมงาน Deskspace ได้รับข้อความจาก <strong>{$display_name}</strong> เรียบร้อยแล้ว<br>
                        จะติดต่อกลับเพื่อชี้แจงข้อสงสัยทาง <strong>Line หรืออีเมล</strong> โดยเร็วที่สุดค่ะ
                    </p>
                    <div style='background:#fffdf8;border:1px solid #e8d8b0;border-radius:8px;padding:14px;margin:20px auto;max-width:420px;text-align:left;'>
                        <p style='font-size:11px;color:#b69652;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 8px;'>ข้อความของคุณ</p>
                        <p style='font-size:13px;color:#555;line-height:1.6;margin:0;'>$safe_question</p>
                    </div>
                </div>
                <div style='background:#f9f7f3;border-radius:8px;padding:15px;text-align:center;font-size:12px;color:#999;'>
                    หากมีข้อสงสัย: team@boxbillion.com | Line: @deskspace
                </div>"
            . $email_wrap_close;

            wp_mail($email, 'Deskspace — ทีมงานได้รับข้อความของคุณแล้ว',
                $message_customer,
                ['Content-Type: text/html; charset=UTF-8', 'From: Deskspace <deskspaceth@gmail.com>']
            );
        }
    }

    if ($sent_admin) {
        $upload   = wp_upload_dir();
        $base_dir = $upload['basedir'] . '/dslog-deskspace';
        $img_dir  = $base_dir . '/images';
        if (!file_exists($base_dir)) mkdir($base_dir, 0755, true);
        if (!file_exists($img_dir))  mkdir($img_dir,  0755, true);
        $htaccess = $base_dir . '/.htaccess';
        if (!file_exists($htaccess)) file_put_contents($htaccess, "Deny from all\n");

        $log_img_url = '';
        if (!empty($temp_files) && file_exists($temp_files[0])) {
            $log_img_name = 'email_' . date('Ymd_His') . '_' . uniqid() . '.jpg';
            $dest = $img_dir . '/' . $log_img_name;
            if (copy($temp_files[0], $dest)) {
                $log_img_url = $upload['baseurl'] . '/dslog-deskspace/images/' . $log_img_name;
            }
        }

        $privacy_accepted = sanitize_text_field($_POST['privacy_accepted'] ?? '0');
        $log_user_status = sanitize_text_field($_POST['user_status']  ?? ($summary_data['User_Status']  ?? 'Guest'));
        $log_account     = sanitize_text_field($_POST['account_name'] ?? ($summary_data['Account_Name'] ?? 'guest'));

        $log_entry = [
            'log_id'               => uniqid('dsl_email_', true),
            'log_source'           => 'email',
            'บันทึกเมื่อ'            => current_time('mysql'),
            'IP_Address'           => $_SERVER['REMOTE_ADDR'],
            'Intent'               => $intent,
            'User_Status'          => $log_user_status,
            'Account_Name'         => $log_account,
            'Device_Type'          => $summary_data['device_type']  ?? (wp_is_mobile() ? 'Mobile' : 'Desktop'),
            'Traffic_Source'       => $summary_data['traffic_source'] ?? 'Unknown',
            'Privacy_Consent'      => ($privacy_accepted === '1') ? 'Accepted' : 'Not Accepted',
            'Privacy_Consent_Time' => ($privacy_accepted === '1') ? current_time('mysql') : null,
            'ข้อมูลลูกค้า'            => [
                'ชื่อ'         => $name,
                'แพลตฟอร์ม'    => 'Email',
                'เบอร์โทร'      => $tel,
                'Line ID'     => $line_id,
                'Email'       => $email,
                'วันที่เลือก'     => $summary_data['ข้อมูลลูกค้า']['วันที่เลือก'] ?? '-',
            ],
            'คำถาม'                => $question,
            'สเปคโต๊ะ'              => $summary_data['สเปคโต๊ะ']          ?? [],
            'ระยะห่างขาโต๊ะ'        => $summary_data['ระยะห่างขาโต๊ะ']    ?? [],
            'รายละเอียดมุมโต๊ะ'     => $summary_data['รายละเอียดมุมโต๊ะ'] ?? [],
            'รายการ_Options'       => $summary_data['รายการ_Options']    ?? [],
            'จำนวน_Options'        => isset($summary_data['รายการ_Options']) ? count($summary_data['รายการ_Options']) : 0,
            'Warning_Code'         => $summary_data['Warning_Code']      ?? null,
            'Note_System'          => $summary_data['Note_System']       ?? '',
            'รูปภาพ_Snapshot'       => $log_img_url,
        ];

        global $wpdb;
        if (function_exists('dslog_get_table_names')) {
            $tables = dslog_get_table_names();
            $wpdb->insert(
                $tables['logs'],
                array(
                    'log_id'          => $log_entry['log_id'],
                    'timestamp'       => $log_entry['บันทึกเมื่อ'],
                    'ip_address'      => $log_entry['IP_Address'],
                    'traffic_source'  => $log_entry['Traffic_Source'],
                    'device_type'     => $log_entry['Device_Type'],
                    'utm_source'      => sanitize_text_field($_POST['utm_source'] ?? ''),
                    'utm_medium'      => sanitize_text_field($_POST['utm_medium'] ?? ''),
                    'utm_campaign'    => sanitize_text_field($_POST['utm_campaign'] ?? ''),
                    'utm_content'     => sanitize_text_field($_POST['utm_content'] ?? ''),
                    'referrer'        => isset($_SERVER['HTTP_REFERER']) ? esc_url_raw($_SERVER['HTTP_REFERER']) : '',
                    'user_id'         => get_current_user_id(),
                    'customer_name'   => $name,
                    'customer_phone'  => $tel,
                    'total_price'     => floatval($summary_data['ราคารวม_บาท'] ?? ($summary_data['ราคารวม'] ?? 0.00)),
                    'desk_type'       => sanitize_text_field($summary_data['สเปคโต๊ะ']['ประเภท'] ?? ''),
                    'config_data'     => json_encode($log_entry, JSON_UNESCAPED_UNICODE),
                    'time_spent'      => is_array($_POST['time_spent'] ?? null) ? json_encode($_POST['time_spent']) : sanitize_text_field($_POST['time_spent'] ?? ''),
                    'heatmap_clicks'  => is_array($_POST['heatmap_clicks'] ?? null) ? json_encode($_POST['heatmap_clicks']) : sanitize_text_field($_POST['heatmap_clicks'] ?? ''),
                    'dropoff_step'    => sanitize_text_field($_POST['dropoff_step'] ?? 'proposal'),
                    'warning_code'    => sanitize_text_field($log_entry['Warning_Code'] ?? ''),
                    'admin_notes'     => '',
                    'lead_status'     => 'new',
                    'order_id'        => null,
                    'snapshot_url'    => $log_img_url,
                    'privacy_consent' => $log_entry['Privacy_Consent'] ?? '',
                )
            );
        } else {
            file_put_contents(
                $base_dir . '/logs.jsonl',
                json_encode($log_entry, JSON_UNESCAPED_UNICODE) . PHP_EOL,
                FILE_APPEND | LOCK_EX
            );
        }
    }

    foreach ($temp_files as $f) { if (file_exists($f)) unlink($f); }

    if ($sent_admin) wp_send_json_success();
    else wp_send_json_error('Email sending failed.');
}

// 2. Authentication Login Handler
add_action('wp_ajax_ds_ajax_login', 'ds_handle_ajax_login');
add_action('wp_ajax_nopriv_ds_ajax_login', 'ds_handle_ajax_login');

function ds_handle_ajax_login() {
    if (!isset($_POST['security']) || !wp_verify_nonce($_POST['security'], 'ds_auth_nonce')) {
        wp_send_json_error('Security Check Failed');
        wp_die();
    }
    
    $creds = array(
        'user_login'    => sanitize_text_field($_POST['log']),
        'user_password' => $_POST['pwd'],
        'remember'      => (isset($_POST['rememberme']) && $_POST['rememberme'] == 'forever')
    );

    $user = wp_signon($creds, false); 

    if (is_wp_error($user)) {
        wp_send_json_error($user->get_error_message());
    } else {
        wp_send_json_success('Login Success');
    }
    wp_die();
}

// 3. Register Handler
add_action('wp_ajax_nopriv_ds_ajax_register', 'ds_handle_ajax_register');

function ds_handle_ajax_register() {
    if (!isset($_POST['security']) || !wp_verify_nonce($_POST['security'], 'ds_auth_nonce')) {
        wp_send_json_error('Security Check Failed');
        wp_die();
    }

    if (!empty($_POST['ds_hp'])) {
        wp_send_json_error('Bot detected');
        wp_die();
    }

    $username = sanitize_user($_POST['reg_user']);
    $email    = sanitize_email($_POST['reg_email']);
    $pass1    = $_POST['reg_pass1'];
    $pass2    = $_POST['reg_pass2'];

    if (empty($username) || empty($email) || empty($pass1)) {
        wp_send_json_error('กรุณากรอกข้อมูลให้ครบ');
        wp_die();
    }
    if ($pass1 !== $pass2) {
        wp_send_json_error('รหัสผ่านไม่ตรงกัน');
        wp_die();
    }
    if (username_exists($username) || email_exists($email)) {
        wp_send_json_error('ชื่อผู้ใช้หรืออีเมลนี้ถูกใช้แล้ว');
        wp_die();
    }

    $user_id = wp_create_user($username, $pass1, $email);

    if (is_wp_error($user_id)) {
        wp_send_json_error($user_id->get_error_message());
    } else {
        $user = new WP_User($user_id);
        $user->set_role('customer');

        wp_set_current_user($user_id);
        wp_set_auth_cookie($user_id);
        
        wp_send_json_success('Register Success');
    }
    wp_die();
}

// 4. Forgot Password Handler
add_action('wp_ajax_nopriv_ds_ajax_forgot', 'ds_handle_ajax_forgot');

function ds_handle_ajax_forgot() {
    if (!isset($_POST['security']) || !wp_verify_nonce($_POST['security'], 'ds_auth_nonce')) {
        wp_send_json_error('Security Check Failed');
        wp_die();
    }
    
    if (!empty($_POST['ds_hp'])) { wp_send_json_error('Bot detected'); wp_die(); }

    $login = sanitize_text_field($_POST['forgot_login']);
    $user_data = get_user_by('email', $login);
    if (!$user_data) $user_data = get_user_by('login', $login);

    if (!$user_data) {
        wp_send_json_error('ไม่พบข้อมูลผู้ใช้นี้');
    } else {
        $result = retrieve_password($user_data->user_login);
        if (is_wp_error($result)) {
            wp_send_json_error($result->get_error_message());
        } else {
            wp_send_json_success('Sent');
        }
    }
    wp_die();
}

// 5. Logout Handler
add_action('wp_ajax_ds_ajax_logout', 'ds_handle_ajax_logout');

function ds_handle_ajax_logout() {
    check_ajax_referer('ds_auth_nonce', 'security');
    wp_logout();
    wp_send_json_success();
    wp_die();
}

// 6. Enqueue Auth scripts & Localizer
add_action('wp_enqueue_scripts', 'ds_enqueue_auth_scripts');

function ds_enqueue_auth_scripts() {
    wp_register_script('ds-auth-js', '', [], '', true);
    wp_enqueue_script('ds-auth-js');

    $current_user = wp_get_current_user();
    $user_data = array();
    
    if (is_user_logged_in()) {
        $user_data = (array) $current_user->data;
        $user_data['roles'] = $current_user->roles;
    }

    wp_localize_script('ds-auth-js', 'ds_auth_vars', array(
        'ajax_url'     => admin_url('admin-ajax.php'),
        'nonce'        => wp_create_nonce('ds_auth_nonce'),
        'is_logged'    => is_user_logged_in(),
        'current_user' => $user_data,
        'logout_url'   => wp_logout_url(home_url()),
    ));
    
    wp_localize_script('ds-auth-js', 'dpb_ajax', array(
        'url'   => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('dpb_security_nonce_v4')
    ));
}

// 7. Meta Fetch Handler
add_action('wp_ajax_dpb_meta', 'deskspace_proposal_builder_fetch_meta');
add_action('wp_ajax_nopriv_dpb_meta', 'deskspace_proposal_builder_fetch_meta');

function deskspace_proposal_builder_fetch_meta() {
    if (!defined('EC_DRAW_API_URL')) {
        wp_send_json_error(['message' => 'API URL is not configured'], 500);
    }
    $cache_key = 'deskspace_proposal_builder_meta_v1';
    $cached = get_transient($cache_key);
    if ($cached !== false) {
        wp_send_json($cached);
    }
    $remote_url = add_query_arg(
        [
            'action' => 'meta',
            'token'  => defined('EC_DRAW_API_TOKEN') ? EC_DRAW_API_TOKEN : '',
        ],
        EC_DRAW_API_URL
    );
    $response = wp_remote_get(
        $remote_url,
        [
            'timeout' => 15,
            'headers' => [
                'Accept'        => 'application/json',
                'Authorization' => defined('EC_DRAW_API_TOKEN') ? 'Bearer ' . EC_DRAW_API_TOKEN : '',
            ],
        ]
    );
    if (is_wp_error($response)) {
        wp_send_json_error(['message' => $response->get_error_message()], 502);
    }
    $code = (int) wp_remote_retrieve_response_code($response);
    $body = wp_remote_retrieve_body($response);
    if ($code < 200 || $code >= 300) {
        $message = sprintf('Remote API responded with HTTP %d', $code ?: 0);
        wp_send_json_error(['message' => $message], $code ?: 500);
    }
    $data = json_decode($body, true);
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
        wp_send_json_error(['message' => 'Remote API returned an invalid payload'], 500);
    }
    set_transient($cache_key, $data, 15 * MINUTE_IN_SECONDS);
    wp_send_json($data);
}

// 8. Admin Mode Injection Block
add_action('wp_head', function() {
    if (!current_user_can('administrator')) return;
    ?>
    <script>
    window.dsAdminMode = window.dsAdminMode || {};
    window.dsAdminMode.active = false;
    window.dsAdminMode.token = '<?= defined('DS_ADMIN_TOKEN') ? esc_js(DS_ADMIN_TOKEN) : '' ?>';
    window.dsAdminMode.apiUrl = '<?= defined('DS_ADMIN_API_URL') ? esc_js(DS_ADMIN_API_URL) : '' ?>';
    window.dsAdminMode.ajaxUrl = '<?= admin_url('admin-ajax.php') ?>';
    window.dsAdminMode.nonce = '<?= wp_create_nonce('ds_admin_mode_nonce') ?>';
    </script>
    <?php
}, 5);

// 9. Image Proxy Handler to Bypass CORS
add_action('wp_ajax_ds_image_proxy', 'ds_image_proxy_handler');
add_action('wp_ajax_nopriv_ds_image_proxy', 'ds_image_proxy_handler');

function ds_image_proxy_handler() {
    $url = isset($_GET['url']) ? esc_url_raw($_GET['url']) : '';
    if (empty($url)) {
        status_header(400);
        exit;
    }

    if (strpos($url, 'deskspace.in.th') === false) {
        status_header(403);
        exit;
    }

    $cache_key = 'ds_img_proxy_' . md5($url);
    $cached = get_transient($cache_key);
    if ($cached !== false) {
        header('Content-Type: ' . $cached['type']);
        header('Access-Control-Allow-Origin: *');
        header('Cache-Control: max-age=604800, public');
        echo $cached['body'];
        exit;
    }

    $response = wp_remote_get($url, [
        'timeout' => 30,
        'sslverify' => false
    ]);

    if (is_wp_error($response)) {
        status_header(502);
        exit;
    }

    $body = wp_remote_retrieve_body($response);
    $headers = wp_remote_retrieve_headers($response);
    $content_type = $headers['content-type'] ?? 'image/jpeg';

    set_transient($cache_key, [
        'type' => $content_type,
        'body' => $body
    ], 7 * DAY_IN_SECONDS);

    header('Content-Type: ' . $content_type);
    header('Access-Control-Allow-Origin: *');
    header('Cache-Control: max-age=604800, public');
    echo $body;
    exit;
}
