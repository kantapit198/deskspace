<?php
/**
 * Database Setup and Migration for Deskspace Configurator
 */

if (!defined('ABSPATH')) exit;

function dslog_get_table_names() {
    global $wpdb;
    return array(
        'logs'   => $wpdb->prefix . 'ds_logs',
        'visits' => $wpdb->prefix . 'ds_visits'
    );
}

function dslog_create_tables() {
    global $wpdb;
    $tables = dslog_get_table_names();
    $charset_collate = $wpdb->get_charset_collate();

    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');

    // Logs Table SQL
    $sql_logs = "CREATE TABLE {$tables['logs']} (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        log_id varchar(50) NOT NULL,
        timestamp datetime NOT NULL,
        ip_address varchar(45) DEFAULT '',
        traffic_source varchar(100) DEFAULT '',
        device_type varchar(50) DEFAULT '',
        utm_source varchar(100) DEFAULT '',
        utm_medium varchar(100) DEFAULT '',
        utm_campaign varchar(100) DEFAULT '',
        utm_content varchar(100) DEFAULT '',
        referrer text,
        user_id bigint(20) DEFAULT 0,
        customer_name varchar(255) DEFAULT '',
        customer_phone varchar(50) DEFAULT '',
        total_price decimal(10,2) DEFAULT 0.00,
        desk_type varchar(100) DEFAULT '',
        config_data longtext,
        time_spent text,
        heatmap_clicks text,
        dropoff_step varchar(100) DEFAULT '',
        warning_code varchar(50) DEFAULT '',
        admin_notes text,
        lead_status varchar(50) DEFAULT 'new',
        order_id bigint(20) DEFAULT NULL,
        snapshot_url text,
        privacy_consent varchar(20) DEFAULT '',
        PRIMARY KEY  (id),
        UNIQUE KEY log_id (log_id),
        KEY timestamp (timestamp),
        KEY lead_status (lead_status),
        KEY order_id (order_id)
    ) $charset_collate;";

    dbDelta($sql_logs);

    // Visits Table SQL
    $sql_visits = "CREATE TABLE {$tables['visits']} (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        timestamp datetime NOT NULL,
        source varchar(100) DEFAULT '',
        device varchar(50) DEFAULT '',
        ip varchar(45) DEFAULT '',
        utm_source varchar(100) DEFAULT '',
        utm_medium varchar(100) DEFAULT '',
        utm_campaign varchar(100) DEFAULT '',
        utm_content varchar(100) DEFAULT '',
        referrer text,
        PRIMARY KEY  (id),
        KEY timestamp (timestamp)
    ) $charset_collate;";

    dbDelta($sql_visits);

    // Trigger migration after tables are created
    dslog_migrate_jsonl_to_sql();
}

function dslog_migrate_jsonl_to_sql() {
    // Only run migration once
    if (get_option('dslog_db_migrated') === 'yes') {
        return;
    }

    global $wpdb;
    $tables = dslog_get_table_names();
    $upload = wp_upload_dir();
    $base_dir = $upload['basedir'] . '/dslog-deskspace';

    // 1. Migrate visits.jsonl
    $visits_file = $base_dir . '/visits.jsonl';
    if (file_exists($visits_file)) {
        $lines = file($visits_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines) {
            foreach ($lines as $line) {
                $data = json_decode($line, true);
                if ($data) {
                    $wpdb->insert(
                        $tables['visits'],
                        array(
                            'timestamp'    => isset($data['timestamp']) ? $data['timestamp'] : current_time('mysql'),
                            'source'       => isset($data['source']) ? sanitize_text_field($data['source']) : '',
                            'device'       => isset($data['device']) ? sanitize_text_field($data['device']) : '',
                            'ip'           => isset($data['ip']) ? sanitize_text_field($data['ip']) : '',
                            'utm_source'   => isset($data['utm_source']) ? sanitize_text_field($data['utm_source']) : '',
                            'utm_medium'   => isset($data['utm_medium']) ? sanitize_text_field($data['utm_medium']) : '',
                            'utm_campaign' => isset($data['utm_campaign']) ? sanitize_text_field($data['utm_campaign']) : '',
                            'utm_content'  => isset($data['utm_content']) ? sanitize_text_field($data['utm_content']) : '',
                            'referrer'     => isset($data['referrer']) ? esc_url_raw($data['referrer']) : '',
                        )
                    );
                }
            }
        }
    }

    // 2. Migrate logs.jsonl
    $logs_file = $base_dir . '/logs.jsonl';
    if (file_exists($logs_file)) {
        $lines = file($logs_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines) {
            foreach ($lines as $line) {
                $data = json_decode($line, true);
                if ($data) {
                    $log_id = isset($data['log_id']) ? sanitize_text_field($data['log_id']) : uniqid('dsl_', true);
                    $timestamp = isset($data['บันทึกเมื่อ']) ? $data['บันทึกเมื่อ'] : current_time('mysql');
                    $ip = isset($data['IP_Address']) ? sanitize_text_field($data['IP_Address']) : '';
                    $source = isset($data['Traffic_Source']) ? sanitize_text_field($data['Traffic_Source']) : '';
                    $device = isset($data['Device_Type']) ? sanitize_text_field($data['Device_Type']) : '';

                    // Capture nested customer options/data
                    $cust_name = '';
                    $cust_phone = '';
                    if (isset($data['ข้อมูลลูกค้า']) && is_array($data['ข้อมูลลูกค้า'])) {
                        $cust_name = isset($data['ข้อมูลลูกค้า']['ชื่อ']) ? sanitize_text_field($data['ข้อมูลลูกค้า']['ชื่อ']) : '';
                        $cust_phone = isset($data['ข้อมูลลูกค้า']['เบอร์โทร']) ? sanitize_text_field($data['ข้อมูลลูกค้า']['เบอร์โทร']) : '';
                    }

                    // Price from design (if stored)
                    $price = 0.00;
                    if (isset($data['ราคารวม_บาท'])) {
                        $price = floatval($data['ราคารวม_บาท']);
                    } elseif (isset($data['ราคารวม'])) {
                        $price = floatval($data['ราคารวม']);
                    }

                    // Desk type
                    $desk_type = '';
                    if (isset($data['สเปคโต๊ะ']) && is_array($data['สเปคโต๊ะ'])) {
                        $desk_type = isset($data['สเปคโต๊ะ']['ประเภท']) ? sanitize_text_field($data['สเปคโต๊ะ']['ประเภท']) : '';
                    }

                    $warning = isset($data['Warning_Code']) ? sanitize_text_field($data['Warning_Code']) : '';
                    $snapshot = isset($data['รูปภาพ_Snapshot']) ? esc_url_raw($data['รูปภาพ_Snapshot']) : '';
                    $privacy = isset($data['Privacy_Consent']) ? sanitize_text_field($data['Privacy_Consent']) : '';

                    // Get UTM properties if present
                    $utm_src = isset($data['utm_source']) ? sanitize_text_field($data['utm_source']) : '';
                    $utm_med = isset($data['utm_medium']) ? sanitize_text_field($data['utm_medium']) : '';
                    $utm_cam = isset($data['utm_campaign']) ? sanitize_text_field($data['utm_campaign']) : '';
                    $utm_con = isset($data['utm_content']) ? sanitize_text_field($data['utm_content']) : '';
                    $ref     = isset($data['referrer']) ? esc_url_raw($data['referrer']) : '';

                    // Time spent and heatmap clicks
                    $time_spent = isset($data['time_spent']) ? (is_array($data['time_spent']) ? json_encode($data['time_spent']) : $data['time_spent']) : '';
                    $heatmap = isset($data['heatmap_clicks']) ? (is_array($data['heatmap_clicks']) ? json_encode($data['heatmap_clicks']) : $data['heatmap_clicks']) : '';
                    $dropoff = isset($data['dropoff_step']) ? sanitize_text_field($data['dropoff_step']) : '';

                    // Options list payload
                    $config_data = json_encode($data, JSON_UNESCAPED_UNICODE);

                    $wpdb->insert(
                        $tables['logs'],
                        array(
                            'log_id'          => $log_id,
                            'timestamp'       => $timestamp,
                            'ip_address'      => $ip,
                            'traffic_source'  => $source,
                            'device_type'     => $device,
                            'utm_source'      => $utm_src,
                            'utm_medium'      => $utm_med,
                            'utm_campaign'    => $utm_cam,
                            'utm_content'     => $utm_con,
                            'referrer'        => $ref,
                            'user_id'         => 0,
                            'customer_name'   => $cust_name,
                            'customer_phone'  => $cust_phone,
                            'total_price'     => $price,
                            'desk_type'       => $desk_type,
                            'config_data'     => $config_data,
                            'time_spent'      => $time_spent,
                            'heatmap_clicks'  => $heatmap,
                            'dropoff_step'    => $dropoff,
                            'warning_code'    => $warning,
                            'admin_notes'     => '',
                            'lead_status'     => 'new',
                            'order_id'        => null,
                            'snapshot_url'    => $snapshot,
                            'privacy_consent' => $privacy,
                        )
                    );
                }
            }
        }
    }

    update_option('dslog_db_migrated', 'yes');
}

// Link WooCommerce Order to Configurator Log
add_action('woocommerce_checkout_order_processed', 'dslog_link_woocommerce_order', 10, 3);
function dslog_link_woocommerce_order($order_id, $posted_data, $order) {
    if (isset($_COOKIE['ds_last_log_id'])) {
        $log_id = sanitize_text_field($_COOKIE['ds_last_log_id']);
        global $wpdb;
        $tables = dslog_get_table_names();
        $wpdb->update(
            $tables['logs'],
            array('order_id' => $order_id, 'lead_status' => 'converted'),
            array('log_id' => $log_id)
        );
    }
}

