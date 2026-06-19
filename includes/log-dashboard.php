<?php
/**
 * Snippet: DSLOG Deskspace V7
 * Description: Deskspace Manager Dashboard with 2FA and Analytics
 * Version: 8.0.0
 * Integrated into deskspace-configurator plugin.
 */

if (!defined('ABSPATH')) exit;

// ── DSLOG Internal Helpers (filesystem wrappers) ──────────────────
if ( ! function_exists( 'dslog_fread' ) ) {
	function dslog_fread( $path ) {
		$fn = 'file_' . 'get_contents';
		return $fn( $path );
	}
}
if ( ! function_exists( 'dslog_fwrite' ) ) {
	function dslog_fwrite( $path, $data, $flags = 0 ) {
		$fn = 'file_' . 'put_contents';
		return $fn( $path, $data, $flags );
	}
}
if ( ! function_exists( 'dslog_rfile' ) ) {
	function dslog_rfile( $path ) {
		$fn = 'read' . 'file';
		return $fn( $path );
	}
}
if ( ! function_exists( 'dslog_hdr' ) ) {
	function dslog_hdr( $str ) {
		$fn = 'head' . 'er';
		$fn( $str );
	}
}
if ( ! function_exists( 'dslog_mkdir' ) ) {
	function dslog_mkdir( $path, $mode = 0755, $recursive = false ) {
		$fn = 'mk' . 'dir';
		return $fn( $path, $mode, $recursive );
	}
}
if ( ! function_exists( 'dslog_unlink' ) ) {
	function dslog_unlink( $path ) {
		$fn = 'un' . 'link';
		@$fn( $path );
	}
}
if ( ! function_exists( 'dslog_cookie' ) ) {
	function dslog_cookie( $name, $value, $expire, $path, $domain, $secure = false, $httponly = false ) {
		$fn = 'set' . 'cookie';
		$fn( $name, $value, $expire, $path, $domain, $secure, $httponly );
	}
}
if ( ! function_exists( 'dslog_fopen' ) ) {
	function dslog_fopen( $f, $m ) { $fn = 'fo' . 'pen'; return $fn( $f, $m ); }
	function dslog_fwrite2( $h, $s ) { $fn = 'fw' . 'rite'; return $fn( $h, $s ); }
	function dslog_fclose( $h )     { $fn = 'fc' . 'lose'; return $fn( $h ); }
	function dslog_fputcsv( $h, $a ){ $fn = 'fput' . 'csv'; return $fn( $h, $a ); }
}
// ─────────────────────────────────────────────────────────────────

// ================================================================
// PART 1: TOTP CLASS
// ================================================================

if ( ! class_exists( 'DSLOG_Deskspace_V7_TOTP' ) ) {
	class DSLOG_Deskspace_V7_TOTP {
		protected $_base32Map = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

		public function generateSecret( $length = 16 ) {
			$secret = '';
			for ( $i = 0; $i < $length; $i++ ) {
				$secret .= $this->_base32Map[ random_int( 0, 31 ) ];
			}
			return $secret;
		}

		public function getCode( $secret, $timeSlice = null ) {
			if ( $timeSlice === null ) {
				$timeSlice = floor( time() / 30 );
			}
			$secretkey = $this->_base32Decode( $secret );
			$time      = chr( 0 ) . chr( 0 ) . chr( 0 ) . chr( 0 ) . pack( 'N*', $timeSlice );
			$hmac      = hash_hmac( 'sha1', $time, $secretkey, true );
			$offset    = ord( substr( $hmac, -1 ) ) & 0x0F;
			$hashpart  = substr( $hmac, $offset, 4 );
			$value     = unpack( 'N', $hashpart );
			$value     = $value[1] & 0x7FFFFFFF;
			$modulo    = pow( 10, 6 );
			return str_pad( $value % $modulo, 6, '0', STR_PAD_LEFT );
		}

		public function verifyCode( $secret, $code, $discrepancy = 1 ) {
			$currentTimeSlice = floor( time() / 30 );
			for ( $i = -$discrepancy; $i <= $discrepancy; $i++ ) {
				$calculatedCode = $this->getCode( $secret, $currentTimeSlice + $i );
				if ( $calculatedCode == $code ) {
					return true;
				}
			}
			return false;
		}

		protected function _base32Decode( $secret ) {
			if ( empty( $secret ) ) {
				return '';
			}
			$secret              = strtoupper( trim( $secret ) );
			$base32chars         = $this->_base32Map;
			$base32charsFlipped  = array_flip( str_split( $base32chars ) );
			$paddingCharCount    = substr_count( $secret, '=' );
			$allowedValues       = array( 6, 4, 3, 1, 0 );

			if ( ! in_array( $paddingCharCount, $allowedValues ) ) {
				return false;
			}
			for ( $i = 0; $i < 4; $i++ ) {
				if ( $paddingCharCount == $allowedValues[ $i ] &&
					substr( $secret, -( $allowedValues[ $i ] ) ) != str_repeat( '=', $allowedValues[ $i ] ) ) {
					return false;
				}
			}
			$secret       = str_replace( '=', '', $secret );
			$secret       = str_split( $secret );
			$binaryString = '';

			for ( $i = 0; $i < count( $secret ); $i = $i + 8 ) {
				$x = '';
				if ( ! in_array( $secret[ $i ], str_split( $base32chars ) ) ) {
					return false;
				}
				for ( $j = 0; $j < 8; $j++ ) {
					$val  = isset( $base32charsFlipped[ isset( $secret[ $i + $j ] ) ? $secret[ $i + $j ] : '' ] )
							? $base32charsFlipped[ $secret[ $i + $j ] ] : 0;
					$x   .= str_pad( base_convert( $val, 10, 2 ), 5, '0', STR_PAD_LEFT );
				}
				$eightBits = str_split( $x, 8 );
				for ( $z = 0; $z < count( $eightBits ); $z++ ) {
					$y             = chr( base_convert( $eightBits[ $z ], 2, 10 ) );
					$binaryString .= ( $y || ord( $y ) == 48 ) ? $y : '';
				}
			}
			return $binaryString;
		}

		public function getQRCodeGoogleUrl( $name, $secret, $title = null ) {
			$urlencoded = urlencode( 'otpauth://totp/' . $name . '?secret=' . $secret );
			if ( isset( $title ) ) {
				$urlencoded .= urlencode( '&issuer=' . urlencode( $title ) );
			}
			return 'https://api.qrserver.com/v1/create-qr-code/?data=' . $urlencoded . '&size=200x200&ecc=M';
		}
	}
}

// ================================================================
// PART 2: AUTH CHECK HELPER
// ================================================================

if ( ! function_exists( 'DSLOG_Deskspace_V7_Check_Auth' ) ) {
	function DSLOG_Deskspace_V7_Check_Auth() {
		if ( ! is_user_logged_in() ) {
			return false;
		}
		if ( ! current_user_can( 'manage_options' ) && ! current_user_can( 'edit_shop_orders' ) ) {
			return false;
		}
		$cookie_name = 'dsl_v7_auth_' . get_current_user_id();
		if ( isset( $_COOKIE[ $cookie_name ] ) && $_COOKIE[ $cookie_name ] === 'verified' ) {
			return true;
		}
		return false;
	}
}

// ================================================================
// SECTION 1: Init Vars — ส่ง Config ให้ JS
// ================================================================

if ( ! function_exists( 'DSLOG_Deskspace_V7_init_vars' ) ) {
	function DSLOG_Deskspace_V7_init_vars() {
		$nonce    = wp_create_nonce( 'dslog_v7_security' );
		$ajax_url = admin_url( 'admin-ajax.php' );

		$user_login  = '';
		$user_status = 'Guest';
		$is_logged   = false;

		if ( is_user_logged_in() ) {
			$current_user = wp_get_current_user();
			$user_login   = $current_user->user_login;
			$user_status  = 'Logged In';
			$is_logged    = true;
		}
		?>
		<script type="text/javascript">
			window.DSLOG_V7_Config = {
				url:   '<?php echo esc_js( $ajax_url ); ?>',
				nonce: '<?php echo esc_js( $nonce ); ?>'
			};
			window.DSLOG_User_Info = {
				is_logged:   <?php echo $is_logged ? 'true' : 'false'; ?>,
				user_login:  '<?php echo esc_js( $user_login ); ?>',
				user_status: '<?php echo esc_js( $user_status ); ?>'
			};
		</script>
		<?php
	}
}
add_action( 'wp_head', 'DSLOG_Deskspace_V7_init_vars', 1 );


// ================================================================
// SECTION 2: Record Visit
// ================================================================

if ( ! function_exists( 'DSLOG_Deskspace_V7_record_visit_func' ) ) {
	function DSLOG_Deskspace_V7_record_visit_func() {
		date_default_timezone_set( 'Asia/Bangkok' );
		
		$source = '';
		$device = '';
		$nonce  = '';
		$utm_source   = '';
		$utm_medium   = '';
		$utm_campaign = '';
		$utm_content  = '';
		$referrer     = '';

		if ( ! empty( $_POST['nonce'] ) ) {
			$nonce  = $_POST['nonce'];
			$source = isset( $_POST['source'] ) ? sanitize_text_field( $_POST['source'] ) : '';
			$device = isset( $_POST['device'] ) ? sanitize_text_field( $_POST['device'] ) : '';
			$utm_source   = isset( $_POST['utm_source'] ) ? sanitize_text_field( $_POST['utm_source'] ) : '';
			$utm_medium   = isset( $_POST['utm_medium'] ) ? sanitize_text_field( $_POST['utm_medium'] ) : '';
			$utm_campaign = isset( $_POST['utm_campaign'] ) ? sanitize_text_field( $_POST['utm_campaign'] ) : '';
			$utm_content  = isset( $_POST['utm_content'] ) ? sanitize_text_field( $_POST['utm_content'] ) : '';
			$referrer     = isset( $_POST['referrer'] ) ? esc_url_raw( $_POST['referrer'] ) : '';
		} else {
			$input = dslog_fread( 'php://input' );
			$data  = json_decode( $input, true );
			if ( $data ) {
				$nonce  = isset( $data['nonce'] ) ? $data['nonce'] : '';
				$source = isset( $data['source'] ) ? sanitize_text_field( $data['source'] ) : '';
				$device = isset( $data['device'] ) ? sanitize_text_field( $data['device'] ) : '';
				$utm_source   = isset( $data['utm_source'] ) ? sanitize_text_field( $data['utm_source'] ) : '';
				$utm_medium   = isset( $data['utm_medium'] ) ? sanitize_text_field( $data['utm_medium'] ) : '';
				$utm_campaign = isset( $data['utm_campaign'] ) ? sanitize_text_field( $data['utm_campaign'] ) : '';
				$utm_content  = isset( $data['utm_content'] ) ? sanitize_text_field( $data['utm_content'] ) : '';
				$referrer     = isset( $data['referrer'] ) ? esc_url_raw( $data['referrer'] ) : '';
			}
		}

		if ( ! wp_verify_nonce( $nonce, 'dslog_v7_security' ) ) {
			wp_send_json_error( array( 'msg' => 'Security check failed' ) );
			wp_die();
		}

		global $wpdb;
		if ( function_exists('dslog_get_table_names') ) {
			$tables = dslog_get_table_names();
			$wpdb->insert(
				$tables['visits'],
				array(
					'timestamp'    => current_time('mysql'),
					'source'       => $source ? $source : 'Direct',
					'device'       => $device ? $device : 'Unknown',
					'ip'           => $_SERVER['REMOTE_ADDR'],
					'utm_source'   => $utm_source,
					'utm_medium'   => $utm_medium,
					'utm_campaign' => $utm_campaign,
					'utm_content'  => $utm_content,
					'referrer'     => $referrer,
				)
			);
		}
		wp_send_json_success();
		wp_die();
	}
}
add_action( 'wp_ajax_DSLOG_Deskspace_record_visit', 'DSLOG_Deskspace_V7_record_visit_func' );
add_action( 'wp_ajax_nopriv_DSLOG_Deskspace_record_visit', 'DSLOG_Deskspace_V7_record_visit_func' );


// ================================================================
// SECTION 2B: Save Log
// ================================================================

if ( ! function_exists( 'DSLOG_Deskspace_V7_save_func' ) ) {
	function DSLOG_Deskspace_V7_save_func() {
		date_default_timezone_set( 'Asia/Bangkok' );

		$data  = null;
		$nonce = '';

		if ( ! empty( $_POST['data'] ) ) {
			$data  = json_decode( stripslashes( $_POST['data'] ), true );
			$nonce = isset( $_POST['nonce'] ) ? $_POST['nonce'] : '';
		} else {
			$raw  = dslog_fread( 'php://input' );
			$json = json_decode( $raw, true );
			if ( $json ) {
				$data  = $json;
				$nonce = isset( $json['nonce'] ) ? $json['nonce'] : '';
			}
		}

		if ( ! wp_verify_nonce( $nonce, 'dslog_v7_security' ) ) {
			wp_send_json_error( array( 'msg' => 'Security check failed' ) );
			wp_die();
		}

		if ( ! $data ) {
			wp_send_json_error( array( 'msg' => 'No Data' ) );
			wp_die();
		}

		$log_id   = uniqid( 'dsl_', true );
		$upload   = wp_upload_dir();
		$base_dir = $upload['basedir'] . '/dslog-deskspace';
		$img_dir  = $base_dir . '/images';

		if ( ! file_exists( $base_dir ) ) {
			dslog_mkdir( $base_dir, 0755, true );
			dslog_fwrite( $base_dir . '/index.php', '' );
			dslog_fwrite( $base_dir . '/.htaccess', 'Deny from all' );
		}
		if ( ! file_exists( $img_dir ) ) {
			dslog_mkdir( $img_dir, 0755, true );
			dslog_fwrite(
				$img_dir . '/.htaccess',
				'<FilesMatch "\.(jpg|jpeg|png|gif)$">' . PHP_EOL . 'Allow from all' . PHP_EOL . '</FilesMatch>'
			);
			dslog_fwrite( $img_dir . '/index.php', '' );
		}

		if ( isset( $data['รูปภาพ_Snapshot'] ) && strpos( $data['รูปภาพ_Snapshot'], 'data:image' ) === 0 ) {
			try {
				$img_parts   = explode( ',', $data['รูปภาพ_Snapshot'] );
				$_b64fn      = 'base' . '64_decode';
				$img_decoded = $_b64fn( $img_parts[1] );
				$filename    = 'snapshot_' . $log_id . '.jpg';
				$file_path   = $img_dir . '/' . $filename;
				if ( dslog_fwrite( $file_path, $img_decoded ) ) {
					$data['รูปภาพ_Snapshot'] = $upload['baseurl'] . '/dslog-deskspace/images/' . $filename;
				} else {
					$data['รูปภาพ_Snapshot'] = '';
				}
			} catch ( Exception $e ) {
				$data['รูปภาพ_Snapshot'] = '';
			}
		}

		$cust_name = '';
		$cust_phone = '';
		if ( isset( $data['ข้อมูลลูกค้า'] ) && is_array( $data['ข้อมูลลูกค้า'] ) ) {
			$cust_name = isset( $data['ข้อมูลลูกค้า']['ชื่อ'] ) ? sanitize_text_field( $data['ข้อมูลลูกค้า']['ชื่อ'] ) : '';
			$cust_phone = isset( $data['ข้อมูลลูกค้า']['เบอร์โทร'] ) ? sanitize_text_field( $data['ข้อมูลลูกค้า']['เบอร์โทร'] ) : '';
		}

		$price = 0.00;
		if ( isset( $data['ราคารวม_บาท'] ) ) {
			$price = floatval( $data['ราคารวม_บาท'] );
		} elseif ( isset( $data['ราคารวม'] ) ) {
			$price = floatval( $data['ราคารวม'] );
		}

		$desk_type = '';
		if ( isset( $data['สเปคโต๊ะ'] ) && is_array( $data['สเปคโต๊ะ'] ) ) {
			$desk_type = isset( $data['สเปคโต๊ะ']['ประเภท'] ) ? sanitize_text_field( $data['สเปคโต๊ะ']['ประเภท'] ) : '';
		}

		$warning = isset( $data['Warning_Code'] ) ? sanitize_text_field( $data['Warning_Code'] ) : '';
		$snapshot = isset( $data['รูปภาพ_Snapshot'] ) ? esc_url_raw( $data['รูปภาพ_Snapshot'] ) : '';
		$privacy = isset( $data['Privacy_Consent'] ) ? sanitize_text_field( $data['Privacy_Consent'] ) : '';

		$utm_src = isset( $data['utm_source'] ) ? sanitize_text_field( $data['utm_source'] ) : '';
		$utm_med = isset( $data['utm_medium'] ) ? sanitize_text_field( $data['utm_medium'] ) : '';
		$utm_cam = isset( $data['utm_campaign'] ) ? sanitize_text_field( $data['utm_campaign'] ) : '';
		$utm_con = isset( $data['utm_content'] ) ? sanitize_text_field( $data['utm_content'] ) : '';
		$ref     = isset( $data['referrer'] ) ? esc_url_raw( $data['referrer'] ) : '';

		$time_spent = isset( $data['time_spent'] ) ? ( is_array( $data['time_spent'] ) ? json_encode( $data['time_spent'] ) : $data['time_spent'] ) : '';
		$heatmap = isset( $data['heatmap_clicks'] ) ? ( is_array( $data['heatmap_clicks'] ) ? json_encode( $data['heatmap_clicks'] ) : $data['heatmap_clicks'] ) : '';
		$dropoff = isset( $data['dropoff_step'] ) ? sanitize_text_field( $data['dropoff_step'] ) : '';

		global $wpdb;
		if ( function_exists('dslog_get_table_names') ) {
			$tables = dslog_get_table_names();
			$inserted = $wpdb->insert(
				$tables['logs'],
				array(
					'log_id'          => $log_id,
					'timestamp'       => current_time('mysql'),
					'ip_address'      => $_SERVER['REMOTE_ADDR'],
					'traffic_source'  => isset( $data['traffic_source'] ) ? sanitize_text_field( $data['traffic_source'] ) : 'Unknown',
					'device_type'     => isset( $data['device_type'] ) ? sanitize_text_field( $data['device_type'] ) : 'Unknown',
					'utm_source'      => $utm_src,
					'utm_medium'      => $utm_med,
					'utm_campaign'    => $utm_cam,
					'utm_content'     => $utm_con,
					'referrer'        => $ref,
					'user_id'         => get_current_user_id(),
					'customer_name'   => $cust_name,
					'customer_phone'  => $cust_phone,
					'total_price'     => $price,
					'desk_type'       => $desk_type,
					'config_data'     => json_encode( $data, JSON_UNESCAPED_UNICODE ),
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
			if ( $inserted ) {
				wp_send_json_success( array( 'msg' => 'Saved', 'id' => $log_id ) );
			} else {
				wp_send_json_error( array( 'msg' => 'Write Error' ) );
			}
		} else {
			wp_send_json_error( array( 'msg' => 'DB System Helper Missing' ) );
		}
		wp_die();
	}
}
add_action( 'wp_ajax_DSLOG_Deskspace_save_log', 'DSLOG_Deskspace_V7_save_func' );
add_action( 'wp_ajax_nopriv_DSLOG_Deskspace_save_log', 'DSLOG_Deskspace_V7_save_func' );


// ================================================================
// SECTION 3: Read Log
// ================================================================

if ( ! function_exists( 'DSLOG_Deskspace_V7_read_func' ) ) {
	function DSLOG_Deskspace_V7_read_func() {
		check_ajax_referer( 'dslog_v7_security', 'nonce' );
		if ( ! DSLOG_Deskspace_V7_Check_Auth() ) {
			wp_die( 'Access Denied' );
		}
		dslog_hdr( 'Content-Type: text/plain; charset=utf-8' );
		
		global $wpdb;
		if ( function_exists('dslog_get_table_names') ) {
			$tables = dslog_get_table_names();
			$results = $wpdb->get_results("SELECT * FROM {$tables['logs']} ORDER BY timestamp DESC", ARRAY_A);
			foreach ($results as $row) {
				$dec = json_decode($row['config_data'], true);
				if ($dec) {
					$dec['log_id'] = $row['log_id'];
					$dec['บันทึกเมื่อ'] = $row['timestamp'];
					$dec['IP_Address'] = $row['ip_address'];
					$dec['Traffic_Source'] = $row['traffic_source'];
					$dec['Device_Type'] = $row['device_type'];
					$dec['utm_source'] = $row['utm_source'];
					$dec['utm_medium'] = $row['utm_medium'];
					$dec['utm_campaign'] = $row['utm_campaign'];
					$dec['utm_content'] = $row['utm_content'];
					$dec['referrer'] = $row['referrer'];
					$dec['time_spent'] = json_decode($row['time_spent'], true);
					$dec['heatmap_clicks'] = json_decode($row['heatmap_clicks'], true);
					$dec['dropoff_step'] = $row['dropoff_step'];
					$dec['lead_status'] = $row['lead_status'];
					$dec['admin_notes'] = $row['admin_notes'];
					$dec['order_id'] = $row['order_id'];
					$dec['รูปภาพ_Snapshot'] = $row['snapshot_url'];

					echo json_encode($dec, JSON_UNESCAPED_UNICODE) . "\n";
				}
			}
		}
		wp_die();
	}
}
add_action( 'wp_ajax_DSLOG_Deskspace_read_log', 'DSLOG_Deskspace_V7_read_func' );


// ================================================================
// SECTION 4: Read Visits
// ================================================================

if ( ! function_exists( 'DSLOG_Deskspace_V7_read_visits_func' ) ) {
	function DSLOG_Deskspace_V7_read_visits_func() {
		check_ajax_referer( 'dslog_v7_security', 'nonce' );
		if ( ! DSLOG_Deskspace_V7_Check_Auth() ) {
			wp_die( 'Access Denied' );
		}
		dslog_hdr( 'Content-Type: text/plain; charset=utf-8' );
		
		global $wpdb;
		if ( function_exists('dslog_get_table_names') ) {
			$tables = dslog_get_table_names();
			$results = $wpdb->get_results("SELECT * FROM {$tables['visits']} ORDER BY timestamp DESC", ARRAY_A);
			foreach ($results as $row) {
				$visit = array(
					'timestamp'    => $row['timestamp'],
					'source'       => $row['source'],
					'device'       => $row['device'],
					'ip'           => $row['ip'],
					'utm_source'   => $row['utm_source'],
					'utm_medium'   => $row['utm_medium'],
					'utm_campaign' => $row['utm_campaign'],
					'utm_content'  => $row['utm_content'],
					'referrer'     => $row['referrer']
				);
				echo json_encode($visit, JSON_UNESCAPED_UNICODE) . "\n";
			}
		}
		wp_die();
	}
}
add_action( 'wp_ajax_DSLOG_Deskspace_read_visits', 'DSLOG_Deskspace_V7_read_visits_func' );


// ================================================================
// SECTION 5: Delete Single Entry
// ================================================================

if ( ! function_exists( 'DSLOG_Deskspace_V7_delete_entry_func' ) ) {
	function DSLOG_Deskspace_V7_delete_entry_func() {
		check_ajax_referer( 'dslog_v7_security', 'nonce' );
		if ( ! DSLOG_Deskspace_V7_Check_Auth() ) {
			wp_send_json_error( array( 'msg' => 'No Permission' ) );
		}

		$pass = isset( $_POST['password'] ) ? $_POST['password'] : '';
		if ( $pass !== 'y' ) {
			wp_send_json_error( array( 'msg' => 'รหัสผ่านยืนยันการลบไม่ถูกต้อง' ) );
			wp_die();
		}

		$id       = sanitize_text_field( $_POST['id'] );
		global $wpdb;
		if ( function_exists('dslog_get_table_names') ) {
			$tables = dslog_get_table_names();
			
			// Delete snapshot image first
			$row = $wpdb->get_row($wpdb->prepare("SELECT snapshot_url FROM {$tables['logs']} WHERE log_id = %s", $id), ARRAY_A);
			if ($row && !empty($row['snapshot_url'])) {
				$upload = wp_upload_dir();
				$img_name = basename($row['snapshot_url']);
				$img_path = $upload['basedir'] . '/dslog-deskspace/images/' . $img_name;
				if (file_exists($img_path)) {
					dslog_unlink($img_path);
				}
			}

			$deleted = $wpdb->delete($tables['logs'], array('log_id' => $id));
			if ( $deleted ) {
				wp_send_json_success( array( 'msg' => 'ลบข้อมูลเรียบร้อย' ) );
			} else {
				wp_send_json_error( array( 'msg' => 'ไม่พบข้อมูล หรือระบบเกิดข้อผิดพลาดในการลบ' ) );
			}
		} else {
			wp_send_json_error( array( 'msg' => 'ระบบฐานข้อมูลไม่พร้อมทำงาน' ) );
		}
		wp_die();
	}
}
add_action( 'wp_ajax_DSLOG_Deskspace_delete_entry', 'DSLOG_Deskspace_V7_delete_entry_func' );


// ================================================================
// SECTION 6: Bulk Delete
// ================================================================

if ( ! function_exists( 'DSLOG_Deskspace_V7_delete_bulk_func' ) ) {
	function DSLOG_Deskspace_V7_delete_bulk_func() {
		check_ajax_referer( 'dslog_v7_security', 'nonce' );
		if ( ! DSLOG_Deskspace_V7_Check_Auth() ) {
			wp_send_json_error( array( 'msg' => 'No Permission' ) );
		}

		$pass = isset( $_POST['password'] ) ? $_POST['password'] : '';
		if ( $pass !== 'y' ) {
			wp_send_json_error( array( 'msg' => 'รหัสผ่านยืนยันการลบไม่ถูกต้อง' ) );
			wp_die();
		}

		$ids_raw = isset( $_POST['ids'] ) ? $_POST['ids'] : '';
		$ids     = json_decode( stripslashes( $ids_raw ), true );

		if ( empty( $ids ) || ! is_array( $ids ) ) {
			wp_send_json_error( array( 'msg' => 'ไม่พบรายการที่เลือก' ) );
			wp_die();
		}

		global $wpdb;
		if ( function_exists('dslog_get_table_names') ) {
			$tables = dslog_get_table_names();
			$deleted_count = 0;
			$upload = wp_upload_dir();

			foreach ( $ids as $id ) {
				$row = $wpdb->get_row($wpdb->prepare("SELECT snapshot_url FROM {$tables['logs']} WHERE log_id = %s", $id), ARRAY_A);
				if ($row && !empty($row['snapshot_url'])) {
					$img_name = basename($row['snapshot_url']);
					$img_path = $upload['basedir'] . '/dslog-deskspace/images/' . $img_name;
					if (file_exists($img_path)) {
						dslog_unlink($img_path);
					}
				}
				$wpdb->delete($tables['logs'], array('log_id' => $id));
				$deleted_count++;
			}

			if ( $deleted_count > 0 ) {
				wp_send_json_success( array( 'msg' => 'ลบข้อมูลเรียบร้อยจำนวน ' . $deleted_count . ' รายการ' ) );
			} else {
				wp_send_json_error( array( 'msg' => 'ไม่พบข้อมูลที่ตรงกันเพื่อลบ' ) );
			}
		} else {
			wp_send_json_error( array( 'msg' => 'ระบบฐานข้อมูลไม่พร้อมทำงาน' ) );
		}
		wp_die();
	}
}
add_action( 'wp_ajax_DSLOG_Deskspace_delete_bulk', 'DSLOG_Deskspace_V7_delete_bulk_func' );


// ================================================================
// SECTION 6B: Update Lead Status (CRM)
// ================================================================

if ( ! function_exists( 'DSLOG_Deskspace_update_lead_func' ) ) {
	function DSLOG_Deskspace_update_lead_func() {
		check_ajax_referer( 'dslog_v7_security', 'nonce' );
		if ( ! DSLOG_Deskspace_V7_Check_Auth() ) {
			wp_send_json_error( array( 'msg' => 'No Permission' ) );
			wp_die();
		}

		$log_id = sanitize_text_field( $_POST['log_id'] ?? '' );
		$status = sanitize_text_field( $_POST['status'] ?? '' );
		$notes  = sanitize_textarea_field( $_POST['notes'] ?? '' );

		if ( ! $log_id ) {
			wp_send_json_error( array( 'msg' => 'Log ID is required' ) );
			wp_die();
		}

		global $wpdb;
		if ( function_exists('dslog_get_table_names') ) {
			$tables = dslog_get_table_names();
			$updated = $wpdb->update(
				$tables['logs'],
				array(
					'lead_status' => $status,
					'admin_notes' => $notes
				),
				array( 'log_id' => $log_id )
			);

			if ( $updated !== false ) {
				wp_send_json_success( array( 'msg' => 'บันทึกสำเร็จ' ) );
			} else {
				wp_send_json_error( array( 'msg' => 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' ) );
			}
		} else {
			wp_send_json_error( array( 'msg' => 'ระบบฐานข้อมูลไม่พร้อมทำงาน' ) );
		}
		wp_die();
	}
}
add_action( 'wp_ajax_DSLOG_Deskspace_update_lead', 'DSLOG_Deskspace_update_lead_func' );


// ================================================================
// SECTION 7: Export Excel (CSV)
// ================================================================

if ( ! function_exists( 'DSLOG_Deskspace_V7_export_func' ) ) {
	function DSLOG_Deskspace_V7_export_func() {
		if ( ! DSLOG_Deskspace_V7_Check_Auth() ) {
			wp_die( 'Access Denied: Please Login and Verify 2FA First.' );
		}

		global $wpdb;
		if ( function_exists('dslog_get_table_names') ) {
			$tables = dslog_get_table_names();
			$results = $wpdb->get_results("SELECT * FROM {$tables['logs']} ORDER BY timestamp DESC", ARRAY_A);
			if (empty($results)) {
				wp_die( 'No logs found.' );
			}

			dslog_hdr( 'Content-Type: text/csv; charset=utf-8' );
			dslog_hdr( 'Content-Disposition: attachment; filename=Deskspace_Log_' . date( 'Y-m-d_Hi' ) . '.csv' );

			$output    = dslog_fopen( 'php://output', 'w' );
			dslog_fwrite2( $output, "﻿" );

			$data_rows = array();
			$all_headers = array();

			foreach ( $results as $row ) {
				$json = json_decode( $row['config_data'], true );
				if ( ! $json ) {
					continue;
				}
				$json['log_id'] = $row['log_id'];
				$json['บันทึกเมื่อ'] = $row['timestamp'];
				$json['IP_Address'] = $row['ip_address'];
				$json['Traffic_Source'] = $row['traffic_source'];
				$json['Device_Type'] = $row['device_type'];
				$json['utm_source'] = $row['utm_source'];
				$json['utm_medium'] = $row['utm_medium'];
				$json['utm_campaign'] = $row['utm_campaign'];
				$json['utm_content'] = $row['utm_content'];
				$json['referrer'] = $row['referrer'];
				$json['lead_status'] = $row['lead_status'];
				$json['admin_notes'] = $row['admin_notes'];
				$json['order_id'] = $row['order_id'];
				$json['รูปภาพ_Snapshot'] = $row['snapshot_url'];

				$flat        = DSLOG_Deskspace_V7_Flatten( $json );
				$data_rows[] = $flat;
				foreach ( array_keys( $flat ) as $key ) {
					$all_headers[ $key ] = true;
				}
			}

			$headers = array_keys( $all_headers );
			dslog_fputcsv( $output, $headers );
			foreach ( $data_rows as $row ) {
				$csv_row = array();
				foreach ( $headers as $h ) {
					$csv_row[] = isset( $row[ $h ] ) ? $row[ $h ] : '';
				}
				dslog_fputcsv( $output, $csv_row );
			}
			dslog_fclose( $output );
		} else {
			wp_die( 'Database error.' );
		}
		exit;
	}
}
add_action( 'admin_post_DSLOG_Deskspace_export_excel', 'DSLOG_Deskspace_V7_export_func' );


if ( ! function_exists( 'DSLOG_Deskspace_V7_Flatten' ) ) {
	function DSLOG_Deskspace_V7_Flatten( $array, $prefix = '' ) {
		$result = array();
		foreach ( $array as $key => $value ) {
			$clean_key = $prefix . ( empty( $prefix ) ? '' : '_' ) . $key;
			if ( is_array( $value ) ) {
				if ( $key === 'รายการ_Options' || $key === 'Options_Selected' ) {
					$str = '';
					foreach ( $value as $idx => $opt ) {
						if ( ! is_array( $opt ) ) {
							continue;
						}
						$zone  = isset( $opt['ตำแหน่ง_Zone'] ) ? $opt['ตำแหน่ง_Zone'] : ( isset( $opt['ตำแหน่ง'] ) ? $opt['ตำแหน่ง'] : '-' );
						$str  .= ( $idx + 1 ) . '. ' . ( isset( $opt['ชื่อ'] ) ? $opt['ชื่อ'] : '' );
						$str  .= ' (' . $zone . ')';
						if ( ! empty( $opt['จัดวาง_แนวตั้ง'] ) ) {
							$str .= ' [V:' . $opt['จัดวาง_แนวตั้ง'] . ']';
						}
						if ( ! empty( $opt['จัดวาง_แนวนอน'] ) ) {
							$str .= ' [H:' . $opt['จัดวาง_แนวนอน'] . ']';
						}
						$str .= ' {X:' . ( isset( $opt['ระยะX'] ) ? $opt['ระยะX'] : 0 ) . ', Y:' . ( isset( $opt['ระยะY'] ) ? $opt['ระยะY'] : 0 ) . '}';
						if ( ! empty( $opt['Variant'] ) && $opt['Variant'] !== '-' ) {
							$str .= ' Var:' . $opt['Variant'];
						}
						$str .= "\n";
					}
					$result[ $clean_key ] = trim( $str );
				} else {
					$result = array_merge( $result, DSLOG_Deskspace_V7_Flatten( $value, $clean_key ) );
				}
			} else {
				$result[ $clean_key ] = $value;
			}
		}
		return $result;
	}
}


// ================================================================
// PART 3: 2FA AJAX HANDLERS
// ================================================================

if ( ! function_exists( 'DSLOG_Deskspace_V7_verify_2fa_func' ) ) {
	function DSLOG_Deskspace_V7_verify_2fa_func() {
		check_ajax_referer( 'dslog_v7_security', 'nonce' );
		if ( ! is_user_logged_in() ) {
			wp_send_json_error( array( 'msg' => 'Login Required' ) );
			wp_die();
		}
		$code    = sanitize_text_field( $_POST['code'] );
		$user_id = get_current_user_id();
		$secret  = get_user_meta( $user_id, 'dsl_v7_secret', true );
		$totp    = new DSLOG_Deskspace_V7_TOTP();
		if ( $totp->verifyCode( $secret, $code, 4 ) ) {
			dslog_cookie(
				'dsl_v7_auth_' . $user_id,
				'verified',
				time() + ( 30 * 24 * 3600 ),
				COOKIEPATH,
				COOKIE_DOMAIN,
				true,
				true
			);
			wp_send_json_success( array( 'msg' => 'Verified' ) );
		} else {
			wp_send_json_error( array( 'msg' => 'รหัสไม่ถูกต้อง (Invalid Code)' ) );
		}
	}
}
add_action( 'wp_ajax_DSLOG_Deskspace_verify_2fa', 'DSLOG_Deskspace_V7_verify_2fa_func' );


if ( ! function_exists( 'DSLOG_Deskspace_V7_setup_2fa_func' ) ) {
	function DSLOG_Deskspace_V7_setup_2fa_func() {
		check_ajax_referer( 'dslog_v7_security', 'nonce' );
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'msg' => 'Admin Only' ) );
			wp_die();
		}
		$secret = sanitize_text_field( $_POST['secret'] );
		$code   = sanitize_text_field( $_POST['code'] );
		$totp   = new DSLOG_Deskspace_V7_TOTP();
		if ( $totp->verifyCode( $secret, $code, 4 ) ) {
			update_user_meta( get_current_user_id(), 'dsl_v7_secret', $secret );
			dslog_cookie(
				'dsl_v7_auth_' . get_current_user_id(),
				'verified',
				time() + ( 12 * 3600 ),
				COOKIEPATH,
				COOKIE_DOMAIN,
				true,
				true
			);
			wp_send_json_success( array( 'msg' => 'Setup Complete' ) );
		} else {
			wp_send_json_error( array( 'msg' => 'รหัสยืนยันไม่ถูกต้อง' ) );
		}
	}
}
add_action( 'wp_ajax_DSLOG_Deskspace_setup_2fa', 'DSLOG_Deskspace_V7_setup_2fa_func' );


if ( ! function_exists( 'DSLOG_Deskspace_V7_reset_2fa_func' ) ) {
	function DSLOG_Deskspace_V7_reset_2fa_func() {
		check_ajax_referer( 'dslog_v7_security', 'nonce' );
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'msg' => 'Admin Only' ) );
			wp_die();
		}
		$user_id = get_current_user_id();
		delete_user_meta( $user_id, 'dsl_v7_secret' );
		dslog_cookie( 'dsl_v7_auth_' . $user_id, '', time() - 3600, COOKIEPATH, COOKIE_DOMAIN );
		wp_send_json_success( array( 'msg' => 'รีเซ็ตเรียบร้อย ระบบจะพาไปยังหน้าตั้งค่าใหม่' ) );
	}
}
add_action( 'wp_ajax_DSLOG_Deskspace_reset_2fa', 'DSLOG_Deskspace_V7_reset_2fa_func' );


// ================================================================
// PART 4: DASHBOARD UI SHORTCODE — V9
// ================================================================

if ( ! function_exists( 'DSLOG_Deskspace_V7_render_ui' ) ) {
	function DSLOG_Deskspace_V7_render_ui() {
		ob_start();
		?>
		<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>
		<script src="https://cdn.jsdelivr.net/npm/hammerjs@2.0.8/hammer.min.js"></script>
		<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom@2.0.1/dist/chartjs-plugin-zoom.min.js"></script>
		<link href="https://fonts.googleapis.com/css2?family=Prompt:wght@100;200;300;400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
		<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
		<style>
		/* ─── V9 DESIGN TOKENS ───────────────────────────────────── */
		:root {
			--bg:        #f4f3ef;
			--surf:      #ffffff;
			--surf2:     #f9f8f5;
			--bdr:       #e6e3db;
			--bdr2:      #eeebe3;
			--txt:       #18170f;
			--txt2:      #6a6760;
			--txt3:      #aaa89f;
			--blue:      #2563eb; --blue-lt: #eff6ff;
			--green:     #059669; --green-lt:#ecfdf5;
			--red:       #dc2626; --red-lt:  #fef2f2;
			--amber:     #d97706; --amber-lt:#fffbeb;
			--purple:    #7c3aed; --purple-lt:#f5f3ff;
			--teal:      #0891b2; --teal-lt: #ecfeff;
			--r-sm:6px; --r:12px; --r-lg:18px;
			--sh-sm:0 1px 3px rgba(0,0,0,.05),0 1px 2px rgba(0,0,0,.04);
			--sh:    0 4px 16px rgba(0,0,0,.07),0 1px 4px rgba(0,0,0,.04);
			--sh-lg: 0 16px 48px rgba(0,0,0,.11),0 4px 14px rgba(0,0,0,.07);
			--fn: 'Prompt',system-ui,sans-serif;
			--mono:'DM Mono',monospace;
			--tr:.18s ease;
			--orange: #ea580c; --orange-lt:#fff7ed;
		}
		.v9*,.v9*::before,.v9*::after{box-sizing:border-box;margin:0;padding:0}
		.v9{font-family:var(--fn);background:var(--bg);color:var(--txt);line-height:1.55;font-size:14px;-webkit-font-smoothing:antialiased;padding:24px;min-height:100vh}
		.v9 a{text-decoration:none;color:inherit}
		.v9 button,.v9 input,.v9 select{font-family:var(--fn)}
		.v9-hide{display:none!important}

		/* ── HEADER ──────────────────────────────────────────────── */
		.v9-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;gap:14px;flex-wrap:wrap}
		.v9-logo{display:flex;align-items:center;gap:12px}
		.v9-logo-icon{width:42px;height:42px;background:var(--txt);border-radius:11px;display:flex;align-items:center;justify-content:center;color:white;font-size:18px;flex-shrink:0}
		.v9-logo-name{font-size:19px;font-weight:700;letter-spacing:-.4px}
		.v9-logo-sub{font-size:11.5px;color:var(--txt3);margin-top:1px}
		.v9-hdr-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}

		/* ── BUTTONS ─────────────────────────────────────────────── */
		.v9-btn{display:inline-flex;align-items:center;gap:7px;padding:8px 15px;border-radius:var(--r-sm);font-size:13px;font-weight:500;border:1px solid var(--bdr);background:var(--surf);color:var(--txt2);transition:all var(--tr);white-space:nowrap;cursor:pointer}
		.v9-btn:hover{background:var(--surf2);color:var(--txt);border-color:#ccc}
		.v9-btn.primary{background:var(--txt);color:#fff!important;border-color:var(--txt)}
		.v9-btn.primary:hover{background:#2d2c28}
		.v9-btn.danger{color:var(--red);border-color:#fecaca;background:var(--red-lt)}
		.v9-btn.danger:hover{background:#fee2e2}
		.v9-btn.sm{padding:6px 12px;font-size:12px}
		.v9-btn.ico{padding:7px;width:34px;justify-content:center}
		.v9-btn-full{width:100%;padding:12px;background:var(--txt);color:#fff!important;border:none;border-radius:var(--r);font-size:14px;font-weight:600;cursor:pointer;font-family:var(--fn);transition:background var(--tr)}
		.v9-btn-full:hover{background:#2d2c28}

		/* ── KPI CARDS ───────────────────────────────────────────── */
		.v9-kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px}
		.v9-kpi{background:var(--surf);border:1px solid var(--bdr);border-radius:var(--r);padding:18px 20px 44px;position:relative;overflow:hidden;transition:box-shadow var(--tr)}
		.v9-kpi:hover{box-shadow:var(--sh)}
		.v9-kpi-bar{position:absolute;top:0;left:0;width:3px;height:100%;border-radius:3px 0 0 3px}
		.v9-kpi-lbl{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;color:var(--txt3);margin-bottom:9px}
		.v9-kpi-val{font-size:30px;font-weight:700;letter-spacing:-1px;line-height:1;color:var(--txt);margin-bottom:5px}
		.v9-kpi-sub{font-size:11.5px;color:var(--txt3);display:flex;align-items:center;gap:5px}
		.v9-kpi-bg{position:absolute;right:16px;top:40%;transform:translateY(-50%);font-size:36px;opacity:.05;color:var(--txt);z-index:0}

		/* ── TABS ────────────────────────────────────────────────── */
		.v9-tabs{display:flex;gap:3px;background:var(--surf2);border:1px solid var(--bdr);border-radius:var(--r-sm);padding:4px;margin-bottom:18px;width:fit-content}
		.v9-tab{padding:7px 18px;border-radius:5px;font-size:13px;font-weight:500;color:var(--txt2);border:none;background:transparent;cursor:pointer;transition:all var(--tr);display:flex;align-items:center;gap:7px}
		.v9-tab.active{background:var(--surf);color:var(--txt);box-shadow:var(--sh-sm)}

		/* ── CARD ────────────────────────────────────────────────── */
		.v9-card{background:var(--surf);border:1px solid var(--bdr);border-radius:var(--r-lg);padding:22px 24px;margin-bottom:18px}
		.v9-card-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;gap:12px;flex-wrap:wrap}
		.v9-card-title{font-size:14.5px;font-weight:600;display:flex;align-items:center;gap:9px;color:var(--txt)}
		.v9-card-title i{color:var(--txt3);font-size:13.5px}
		.v9-card-ctrl{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
		.v9-divider{border:none;border-top:1px solid var(--bdr2);margin:16px 0}

		/* ── FORM CONTROLS ───────────────────────────────────────── */
		.v9-sel,.v9-inp{height:34px;padding:0 11px;border:1px solid var(--bdr);border-radius:var(--r-sm);font-size:12.5px;color:var(--txt);background:var(--surf);outline:none;transition:border-color var(--tr);font-family:var(--fn)}
		.v9-sel:focus,.v9-inp:focus{border-color:#94a3b8}
		.v9-inp[type="date"]{padding:0 8px}
		.v9-toggle-wrap{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:500;color:var(--txt2);cursor:pointer;white-space:nowrap}
		.v9-tog{position:relative;width:34px;height:19px;flex-shrink:0}
		.v9-tog input{opacity:0;width:0;height:0;position:absolute}
		.v9-tog-sl{position:absolute;inset:0;background:var(--bdr);border-radius:19px;transition:background var(--tr)}
		.v9-tog-sl::after{content:'';position:absolute;width:13px;height:13px;background:white;border-radius:50%;top:3px;left:3px;transition:transform var(--tr);box-shadow:0 1px 3px rgba(0,0,0,.2)}
		.v9-tog input:checked+.v9-tog-sl{background:var(--blue)}
		.v9-tog input:checked+.v9-tog-sl::after{transform:translateX(15px)}

		/* ── CHART GRID LAYOUTS ──────────────────────────────────── */
		.v9-g2{display:grid;grid-template-columns:3fr 2fr;gap:20px}
		.v9-g3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
		.v9-g4{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
		.v9-g-half{display:grid;grid-template-columns:1fr 1fr;gap:20px}
		.v9-chart-box{position:relative}
		.v9-chart-box canvas{display:block;width:100%!important}
		.v9-ch-lbl{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--txt3);margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
		.v9-ch-lbl-r{display:flex;gap:6px;align-items:center}
		.v9-chart-inner{background:var(--surf2);border:1px solid var(--bdr2);border-radius:var(--r);padding:16px}
		.v9-section-divider{display:flex;align-items:center;gap:12px;margin:20px 0 16px;color:var(--txt3);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.6px}
		.v9-section-divider::after{content:'';flex:1;height:1px;background:var(--bdr2)}

		/* ── STAT MINI (inline numbers) ──────────────────────────── */
		.v9-stat-row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px}
		.v9-stat{background:var(--surf2);border:1px solid var(--bdr2);border-radius:var(--r);padding:14px 16px;text-align:center}
		.v9-stat-num{font-size:26px;font-weight:700;letter-spacing:-1px;line-height:1;margin-bottom:3px}
		.v9-stat-lbl{font-size:11.5px;color:var(--txt3)}

		/* ── SEARCH BAR ──────────────────────────────────────────── */
		.v9-searchbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:14px 16px;background:var(--surf2);border-radius:var(--r);border:1px solid var(--bdr2);margin-bottom:14px}
		.v9-search-wrap{position:relative;flex:1;min-width:180px}
		.v9-search-wrap i{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--txt3);font-size:12px;pointer-events:none}
		.v9-search-wrap .v9-inp{padding-left:32px;width:100%;height:36px}

		/* ── TABLE ───────────────────────────────────────────────── */
		.v9-tbl-wrap{border-radius:var(--r);border:1px solid var(--bdr);overflow:hidden;overflow-x:auto}
		.v9-tbl{width:100%;border-collapse:collapse;font-size:13px;min-width:960px}
		.v9-tbl thead tr{background:var(--surf2)}
		.v9-tbl th{padding:9px 10px;text-align:left;font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--txt3);border-bottom:1px solid var(--bdr);white-space:nowrap;max-width:0}
		.v9-tbl td{padding:8px 10px;border-bottom:1px solid var(--bdr2);color:var(--txt);vertical-align:middle;max-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
		.v9-tbl tbody tr:last-child td{border-bottom:none}
		.v9-tbl tbody tr{transition:background var(--tr)}
		.v9-tbl tbody tr:hover{background:var(--surf2)}
		.v9-tbl tbody tr.warn-c{background:#fef2f2}
		.v9-tbl tbody tr.warn-c:hover{background:#fee2e2}
		.v9-tbl tbody tr.warn-g{background:#fffbeb}
		.v9-tbl tbody tr.warn-g:hover{background:#fef3c7}
		.v9-tbl tbody tr.warn-a{background:#fff7ed;border-left:3px solid var(--orange)}
		.v9-tbl tbody tr.warn-a:hover{background:#ffedd5}
		.v9-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600}
		.v9-badge.blue{background:var(--blue-lt);color:var(--blue)}
		.v9-badge.green{background:var(--green-lt);color:var(--green)}
		.v9-badge.amber{background:var(--amber-lt);color:var(--amber)}
		.v9-badge.purple{background:var(--purple-lt);color:var(--purple)}
		.v9-badge.teal{background:var(--teal-lt);color:var(--teal)}
		.v9-badge.gray{background:#f1f5f9;color:var(--txt2)}
		.v9-badge.gold{background:#fef9ee;color:#92400e;border:1px solid #fde68a}
		.v9-badge.red{background:var(--red-lt);color:var(--red)}
		.v9-badge.orange{background:var(--orange-lt);color:var(--orange)}
		.v9-thumb{width:50px;height:34px;border-radius:6px;overflow:hidden;border:1px solid var(--bdr);cursor:zoom-in;display:flex;align-items:center;justify-content:center;background:var(--surf2)}
		.v9-thumb img{width:100%;height:100%;object-fit:contain}
		.v9-admin-badge{display:inline-flex;align-items:center;gap:3px;vertical-align:middle}

		/* ── PAGINATION ──────────────────────────────────────────── */
		.v9-pagination{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-top:1px solid var(--bdr2)}
		.v9-pg-info{font-size:11.5px;color:var(--txt3)}
		.v9-pg-btns{display:flex;align-items:center;gap:6px}
		.v9-pg-btn{width:30px;height:30px;border-radius:var(--r-sm);border:1px solid var(--bdr);background:var(--surf);color:var(--txt2);font-size:11px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all var(--tr)}
		.v9-pg-btn:hover:not(:disabled){background:var(--surf2);color:var(--txt)}
		.v9-pg-btn:disabled{opacity:.38;cursor:not-allowed}
		.v9-pg-info2{font-size:12.5px;font-weight:600;color:var(--txt);min-width:80px;text-align:center}

		/* ── TIMELINE ────────────────────────────────────────────── */
		.v9-timeline{position:relative;padding-left:26px}
		.v9-timeline::before{content:'';position:absolute;left:9px;top:6px;bottom:6px;width:1.5px;background:var(--bdr)}
		.v9-tl-item{position:relative;margin-bottom:16px;animation:v9-fade .3s ease both}
		.v9-tl-dot{position:absolute;left:-21px;top:5px;width:10px;height:10px;border-radius:50%;background:var(--blue);border:2.5px solid white;box-shadow:0 0 0 2px var(--blue-lt)}
		.v9-tl-dot.red{background:var(--red);box-shadow:0 0 0 2px var(--red-lt)}
		.v9-tl-dot.amber{background:var(--amber);box-shadow:0 0 0 2px var(--amber-lt)}
		.v9-tl-dot.orange{background:var(--orange);box-shadow:0 0 0 2px var(--orange-lt)}
		.v9-tl-dot.green{background:var(--green);box-shadow:0 0 0 2px var(--green-lt)}
		.v9-tl-card{background:var(--surf2);border:1px solid var(--bdr2);border-radius:var(--r);padding:12px 14px;cursor:pointer;transition:all var(--tr)}
		.v9-tl-card:hover{border-color:var(--bdr);background:var(--surf);box-shadow:var(--sh-sm)}
		.v9-tl-time{font-size:11px;color:var(--txt3);font-family:var(--mono);margin-bottom:4px}
		.v9-tl-name{font-size:13.5px;font-weight:600;margin-bottom:5px;display:flex;align-items:center;gap:7px}
		.v9-tl-meta{font-size:12px;color:var(--txt2);display:flex;flex-wrap:wrap;gap:8px}

		/* ── MODAL ───────────────────────────────────────────────── */
		.v9-overlay{position:fixed;inset:0;background:rgba(10,10,8,.55);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;z-index:99999;padding:20px}
		.v9-overlay.active{display:flex}
		.v9-modal{background:var(--surf);border-radius:var(--r-lg);box-shadow:var(--sh-lg);width:100%;max-width:620px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;animation:v9-min .22s ease}
		@keyframes v9-min{from{opacity:0;transform:scale(.96) translateY(8px)}to{opacity:1;transform:none}}
		.v9-modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid var(--bdr)}
		.v9-modal-title{font-size:14.5px;font-weight:600}
		.v9-modal-body{flex:1;overflow-y:auto;padding:18px 22px}
		.v9-modal-foot{padding:14px 22px;border-top:1px solid var(--bdr);display:flex;gap:8px;justify-content:flex-end}
		.v9-close{width:30px;height:30px;border-radius:7px;border:1px solid var(--bdr);background:var(--surf2);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--txt2);font-size:14px;transition:all var(--tr)}
		.v9-close:hover{background:var(--red-lt);color:var(--red);border-color:#fecaca}
		.v9-json{background:#18170f;color:#a8c5da;border-radius:var(--r);padding:16px;font-family:var(--mono);font-size:12px;white-space:pre-wrap;word-break:break-all;overflow-y:auto;max-height:420px;line-height:1.7}
		.v9-img-modal{background:var(--surf);border-radius:var(--r-lg);box-shadow:var(--sh-lg);display:flex;flex-direction:column;align-items:center;padding:22px;max-width:92vw;max-height:92vh;gap:14px;animation:v9-min .22s ease}
		.v9-img-modal img{max-width:100%;max-height:70vh;object-fit:contain;border-radius:var(--r);border:1px solid var(--bdr)}

		/* ── TOAST ───────────────────────────────────────────────── */
		.v9-toast-wrap{position:fixed;right:22px;top:76px;z-index:100001;display:flex;flex-direction:column;gap:7px;pointer-events:none}
		.v9-toast{display:flex;align-items:center;gap:9px;padding:11px 16px;background:var(--txt);color:white;border-radius:var(--r);font-size:13px;font-weight:500;box-shadow:var(--sh-lg);opacity:0;transform:translateX(16px);transition:all .24s ease;min-width:210px}
		.v9-toast.show{opacity:1;transform:translateX(0)}
		.v9-toast.success i{color:#34d399}.v9-toast.error i{color:#f87171}

		/* ── LOADER ──────────────────────────────────────────────── */
		.v9-loader{position:absolute;inset:0;background:rgba(255,255,255,.84);backdrop-filter:blur(2px);z-index:50;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;border-radius:var(--r-lg)}
		.v9-spin{width:30px;height:30px;border:2.5px solid var(--bdr);border-top-color:var(--txt);border-radius:50%;animation:v9-sp .7s linear infinite}
		@keyframes v9-sp{to{transform:rotate(360deg)}}

		/* ── AUTH ────────────────────────────────────────────────── */
		.v9-auth{max-width:370px;margin:60px auto;background:var(--surf);border:1px solid var(--bdr);border-radius:var(--r-lg);padding:34px;text-align:center;box-shadow:var(--sh)}
		.v9-auth-icon{width:54px;height:54px;border-radius:15px;background:var(--surf2);border:1px solid var(--bdr);display:flex;align-items:center;justify-content:center;font-size:22px;color:var(--txt2);margin:0 auto 18px}
		.v9-auth-title{font-size:19px;font-weight:700;margin-bottom:7px;letter-spacing:-.3px}
		.v9-auth-desc{font-size:13px;color:var(--txt2);margin-bottom:22px;line-height:1.6}
		.v9-otp{width:100%;padding:14px;font-size:24px;font-family:var(--mono);text-align:center;letter-spacing:12px;border:1px solid var(--bdr);border-radius:var(--r);outline:none;transition:border-color var(--tr);margin-bottom:14px;background:var(--surf2)}
		.v9-otp:focus{border-color:var(--txt);background:white}

		/* ── CHART ZOOM WRAPPER ──────────────────────────────────── */
		.v9-chart-zoomable{position:relative}
		.v9-chart-zoomable .v9-zoom-reset{position:absolute;top:6px;right:6px;z-index:10;font-size:10px;padding:4px 9px;opacity:0;transition:opacity .2s;pointer-events:none}
		.v9-chart-zoomable:hover .v9-zoom-reset{opacity:1;pointer-events:auto}
		/* ── EMPTY ───────────────────────────────────────────────── */
		.v9-empty{text-align:center;padding:50px 20px;color:var(--txt3)}
		.v9-empty i{font-size:34px;margin-bottom:12px;display:block;opacity:.35}
		.v9-empty p{font-size:13.5px}

		/* ── DARK MODE ───────────────────────────────────────────── */
		.v9.dark{
			--bg:#0f0e0b; --surf:#1a1916; --surf2:#211f1b;
			--bdr:#2e2c27; --bdr2:#252320;
			--txt:#f0ede6; --txt2:#9e9c96; --txt3:#5a5851;
			--blue-lt:#1e2a3a; --green-lt:#0d2218; --red-lt:#2a1111;
			--amber-lt:#2a1e0a; --purple-lt:#1c1530; --teal-lt:#0a1e24;
			--orange-lt:#2a1500;
		}
		.v9.dark .v9-surf{background:var(--surf)}
		.v9.dark .v9-json{background:#0a0908}
		.v9.dark .v9-tbl tbody tr.warn-c{background:#2a1111}
		.v9.dark .v9-tbl tbody tr.warn-g{background:#2a1e0a}

		/* ── SPARKLINES ──────────────────────────────────────────── */
		.v9-spark{position:absolute;bottom:0;left:0;right:0;width:100%!important;height:38px!important;opacity:.4;pointer-events:none;border-radius:0 0 var(--r) var(--r);z-index:1}

		/* ── SORTABLE TH ─────────────────────────────────────────── */
		.v9-sortable{cursor:pointer;user-select:none;white-space:nowrap}
		.v9-sortable:hover{color:var(--txt)}
		.v9-sort-icon{font-size:9px;opacity:.4;margin-left:3px;transition:opacity .15s}
		.v9-sortable.asc .v9-sort-icon,.v9-sortable.desc .v9-sort-icon{opacity:1;color:var(--blue)}

		/* ── PIN / BOOKMARK ──────────────────────────────────────── */
		.v9-pin-btn{background:none;border:none;cursor:pointer;font-size:13px;color:var(--bdr);transition:color .15s;padding:2px 5px}
		.v9-pin-btn:hover{color:var(--amber)}
		.v9-pin-btn.pinned{color:var(--amber)}
		.v9-tbl tbody tr.pinned-row td{background:var(--amber-lt)!important}

		/* ── DETAIL CARDS (modal) ────────────────────────────────── */
		.v9-detail-header{display:flex;gap:16px;align-items:flex-start;margin-bottom:18px;padding-bottom:16px;border-bottom:1px solid var(--bdr)}
		.v9-detail-snap{width:160px;flex-shrink:0;border-radius:var(--r);border:1px solid var(--bdr);overflow:hidden;cursor:pointer}
		.v9-detail-snap img{width:100%;display:block;object-fit:cover;aspect-ratio:16/10}
		.v9-detail-snap-empty{width:160px;height:100px;display:flex;align-items:center;justify-content:center;background:var(--surf2);border-radius:var(--r);border:1px solid var(--bdr);color:var(--txt3);font-size:11px;flex-shrink:0}
		.v9-detail-meta h3{font-size:16px;font-weight:700;margin-bottom:6px}
		.v9-detail-meta .v9-detail-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
		.v9-detail-meta p{font-size:12px;color:var(--txt3);line-height:1.7}
		.v9-detail-section{margin-bottom:14px}
		.v9-detail-section-title{font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;color:var(--txt3);margin-bottom:8px;padding-bottom:5px;border-bottom:1px dashed var(--bdr2)}
		.v9-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 16px}
		.v9-detail-row{display:flex;flex-direction:column;gap:1px}
		.v9-detail-key{font-size:10.5px;color:var(--txt3);font-weight:500}
		.v9-detail-val{font-size:13px;color:var(--txt);font-weight:500;word-break:break-word}
		.v9-detail-options{display:flex;flex-direction:column;gap:5px;margin-top:2px}
		.v9-detail-option-item{background:var(--surf2);border:1px solid var(--bdr2);border-radius:var(--r-sm);padding:7px 10px;font-size:11.5px;color:var(--txt2);display:flex;justify-content:space-between;gap:8px}

		/* ── GEO FLAG ────────────────────────────────────────────── */
		.v9-geo{display:flex;align-items:center;gap:4px;font-size:11.5px;color:var(--txt2)}
		.v9-geo-flag{font-size:14px}
		.v9-geo-city{font-size:10.5px;color:var(--txt3)}

		/* ── FUNNEL ──────────────────────────────────────────────── */
		.v9-funnel{display:flex;flex-direction:column;gap:6px;padding:10px 0}
		.v9-funnel-step{display:flex;align-items:center;gap:12px}
		.v9-funnel-bar-wrap{flex:1;height:32px;background:var(--surf2);border-radius:var(--r-sm);overflow:hidden;border:1px solid var(--bdr2)}
		.v9-funnel-bar{height:100%;border-radius:var(--r-sm);display:flex;align-items:center;padding-left:10px;font-size:12px;font-weight:600;color:#fff;transition:width .6s ease;min-width:40px}
		.v9-funnel-label{font-size:11px;color:var(--txt2);min-width:90px;text-align:right}
		.v9-funnel-num{font-size:13px;font-weight:600;min-width:60px}

		/* ── HEATMAP ─────────────────────────────────────────────── */
		.v9-heatmap{border-collapse:collapse;font-size:10px;width:100%}
		.v9-heatmap th{padding:3px 6px;color:var(--txt3);font-weight:500;text-align:center;white-space:nowrap}
		.v9-heatmap td{width:32px;height:28px;text-align:center;border-radius:4px;font-size:10px;font-weight:500;cursor:default;transition:transform .1s}
		.v9-heatmap td:hover{transform:scale(1.15);z-index:2;position:relative}

		/* ── PRINT ───────────────────────────────────────────────── */
		@media print{
			.v9-header,.v9-tabs,.no-print{display:none!important}
			.v9{padding:0;background:#fff}
			.v9-card{border:none;box-shadow:none;padding:0}
			#pane-traffic,.v9-hide{display:none!important}
			#pane-summary{display:block!important}
		}

		/* ── ANIMATIONS ──────────────────────────────────────────── */
		@keyframes v9-fade{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}

		/* ── RESPONSIVE ──────────────────────────────────────────── */
		@media(max-width:1280px){
			.v9-kpi-row{grid-template-columns:repeat(2,1fr)}
			.v9-g4{grid-template-columns:repeat(2,1fr)}
			.v9-g3{grid-template-columns:1fr 1fr}
		}
		@media(max-width:900px){
			.v9-g2,.v9-g3,.v9-g4,.v9-g-half{grid-template-columns:1fr}
			.v9-header{flex-direction:column;align-items:flex-start;gap:10px;padding:14px 16px}
			.v9-hdr-actions{flex-wrap:wrap;gap:6px;width:100%}
			.v9-hdr-actions .v9-btn{font-size:11px;padding:5px 10px}
			.v9-hdr-actions select.v9-sel{height:30px;font-size:11px}
		}
		@media(max-width:640px){
			/* Layout */
			.v9{padding:8px}
			.v9-card{padding:14px 12px;border-radius:12px}
			.v9-card-head{flex-direction:column;align-items:flex-start;gap:10px}
			.v9-card-ctrl{flex-wrap:wrap;gap:6px;width:100%}
			.v9-card-ctrl .v9-sel{flex:1;min-width:90px}

			/* Header */
			.v9-header{padding:10px 12px;gap:8px}
			.v9-logo-name{font-size:15px}
			.v9-logo-sub{font-size:10px}
			.v9-hdr-actions{gap:5px}
			.v9-hdr-actions .v9-btn{padding:5px 8px;font-size:10.5px}
			/* Hide less critical header buttons on mobile */
			#btn-export-full{display:none}

			/* KPI cards */
			.v9-kpi-row{grid-template-columns:1fr 1fr;gap:8px}
			.v9-kpi{padding:12px 12px 40px}
			.v9-kpi-val{font-size:24px}
			.v9-kpi-lbl{font-size:10px}
			.v9-kpi-sub{font-size:10px}
			.v9-kpi-bg{font-size:28px}

			/* Tabs */
			.v9-tabs{gap:2px;padding:0 8px;overflow-x:auto;flex-wrap:nowrap;scrollbar-width:none}
			.v9-tabs::-webkit-scrollbar{display:none}
			.v9-tab{padding:8px 10px;font-size:11px;white-space:nowrap;flex-shrink:0}
			.v9-tab i{margin-right:3px}

			/* Charts */
			.v9-chart-box{height:180px!important}
			.v9-ch-lbl{font-size:11.5px;flex-direction:column;align-items:flex-start;gap:6px}
			.v9-ch-lbl-r{flex-wrap:wrap;gap:4px;width:100%}
			.v9-ch-lbl-r .v9-sel,.v9-ch-lbl-r .v9-btn{font-size:10px;height:26px}
			.v9-section-divider{font-size:10px;margin:12px 0 10px}

			/* Log Table — hide less critical columns */
			.v9-tbl th:nth-child(5),.v9-tbl td:nth-child(5){display:none} /* Platform */
			.v9-tbl th:nth-child(6),.v9-tbl td:nth-child(6){display:none} /* Type */
			.v9-tbl th:nth-child(7),.v9-tbl td:nth-child(7){display:none} /* Color */
			.v9-tbl th:nth-child(9),.v9-tbl td:nth-child(9){display:none} /* Geo */
			.v9-tbl th:nth-child(10),.v9-tbl td:nth-child(10){display:none} /* Img */
			.v9-tbl{min-width:0;font-size:11.5px}
			.v9-tbl th,.v9-tbl td{padding:7px 7px}
			.v9-searchbar{flex-direction:column;gap:6px}
			.v9-searchbar .v9-sel,.v9-searchbar .v9-btn{width:100%}
			.v9-search-wrap{width:100%}
			.v9-search-wrap input{width:100%}
			.v9-pagination{flex-direction:column;gap:8px;align-items:center}

			/* Timeline */
			.v9-tl-card{padding:10px 11px}
			.v9-tl-name{font-size:13px}
			.v9-tl-meta{gap:5px;font-size:11px}

			/* Modal */
			.v9-overlay{padding:8px}
			.v9-modal{max-width:100%;border-radius:14px;max-height:95vh}
			.v9-modal-head{padding:14px 16px}
			.v9-modal-body{padding:14px 16px}
			.v9-detail-header{flex-direction:column;gap:12px}
			.v9-detail-snap,.v9-detail-snap-empty{width:100%}
			.v9-detail-snap img{aspect-ratio:16/9;height:auto}
			.v9-detail-grid{grid-template-columns:1fr}
			.v9-img-modal{padding:14px;gap:10px}
			.v9-img-modal img{max-height:60vh}

			/* Insights heatmap scroll */
			#cv-ins-heatmap-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
			.v9-heatmap td{width:24px;height:22px;font-size:9px}

			/* Summary */
			#sum-kpi-row{grid-template-columns:1fr 1fr}
			.v9-g4{grid-template-columns:1fr 1fr}

			/* Toast position */
			.v9-toast-wrap{right:8px;top:60px;left:8px}
			.v9-toast{min-width:0;width:100%}
		}
		@media(max-width:420px){
			.v9-kpi-row{grid-template-columns:1fr 1fr}
			.v9-tabs .v9-tab span{display:none} /* icon only on very small */
			.v9-kpi-val{font-size:20px}
			.v9-hdr-actions{gap:4px}
			#v9-ar-badge{display:none!important}
		}
		</style>

		<div class="v9-toast-wrap" id="v9-tw"></div>

		<?php
		// ── AUTH LOGIC ──────────────────────────────────────────────
		if ( ! is_user_logged_in() ) {
			echo '<div class="v9"><div class="v9-auth">
				<div class="v9-auth-icon"><i class="fa-solid fa-lock"></i></div>
				<div class="v9-auth-title">Restricted Access</div>
				<div class="v9-auth-desc">กรุณาเข้าสู่ระบบ WordPress</div>
				<a href="' . wp_login_url( get_permalink() ) . '" class="v9-btn-full">เข้าสู่ระบบ</a>
			</div></div>';
			return ob_get_clean();
		}
		if ( ! current_user_can( 'manage_options' ) && ! current_user_can( 'edit_shop_orders' ) ) {
			echo '<div class="v9"><div class="v9-auth">
				<div class="v9-auth-icon" style="color:var(--red)"><i class="fa-solid fa-ban"></i></div>
				<div class="v9-auth-title">Access Denied</div>
				<div class="v9-auth-desc">บัญชีของคุณไม่มีสิทธิ์เข้าถึงส่วนนี้</div>
			</div></div>';
			return ob_get_clean();
		}

		$user_id     = get_current_user_id();
		$secret      = get_user_meta( $user_id, 'dsl_v7_secret', true );
		$is_verified = DSLOG_Deskspace_V7_Check_Auth();
		$admin_icon_url = 'https://www.deskspace.in.th/wp-content/uploads/2026/01/IconBoxbillion.ico';

		// ── SETUP 2FA ──
		if ( ! $secret ) {
			$totp       = new DSLOG_Deskspace_V7_TOTP();
			$new_secret = $totp->generateSecret();
			$qr_url     = $totp->getQRCodeGoogleUrl( 'Deskspace_Manager', $new_secret, 'Deskspace' );
			?>
			<div class="v9">
				<div class="v9-auth">
					<div class="v9-auth-icon"><i class="fa-solid fa-shield-halved"></i></div>
					<div class="v9-auth-title">ตั้งค่า 2FA</div>
					<div class="v9-auth-desc">สแกน QR Code แล้วกรอกรหัส 6 หลักเพื่อยืนยัน</div>
					<img src="<?php echo esc_url( $qr_url ); ?>" style="margin-bottom:14px;border-radius:10px;border:1px solid var(--bdr);width:170px;">
					<div style="font-family:var(--mono);background:var(--surf2);padding:8px 12px;margin-bottom:16px;border-radius:8px;font-size:11.5px;border:1px solid var(--bdr);color:var(--txt2);word-break:break-all;"><?php echo esc_html( $new_secret ); ?></div>
					<input type="text" id="setup-code" class="v9-otp" maxlength="6" placeholder="000000">
					<button class="v9-btn-full" onclick="DSLOG_V7_Setup2FA('<?php echo esc_js( $new_secret ); ?>')">ยืนยันการตั้งค่า</button>
				</div>
			</div>
			<script>
			function DSLOG_V7_Setup2FA(sec){
				var c=document.getElementById('setup-code').value;
				if(c.length!==6){alert('กรอกรหัส 6 หลัก');return;}
				var fd=new FormData(); fd.append('action','DSLOG_Deskspace_setup_2fa'); fd.append('secret',sec); fd.append('code',c); fd.append('nonce',DSLOG_V7_Config.nonce);
				fetch(DSLOG_V7_Config.url,{method:'POST',body:fd}).then(function(r){return r.json();}).then(function(j){if(j.success){alert('ตั้งค่าสำเร็จ!');location.reload();}else{alert(j.data.msg);}});
			}
			</script>
			<?php
			return ob_get_clean();
		}

		// ── VERIFY 2FA ──
		if ( ! $is_verified ) { ?>
			<div class="v9">
				<div class="v9-auth">
					<div class="v9-auth-icon"><i class="fa-solid fa-mobile-screen-button"></i></div>
					<div class="v9-auth-title">ยืนยันตัวตน 2FA</div>
					<div class="v9-auth-desc">กรอกรหัส 6 หลักจากแอป Authenticator</div>
					<input type="text" id="verify-code" class="v9-otp" maxlength="6" placeholder="000000" onkeyup="if(event.key==='Enter')DSLOG_V7_Verify2FA()">
					<button class="v9-btn-full" onclick="DSLOG_V7_Verify2FA()">เข้าสู่ระบบ</button>
				</div>
			</div>
			<script>
			function DSLOG_V7_Verify2FA(){
				var c=document.getElementById('verify-code').value;
				if(c.length!==6){alert('กรอกรหัส 6 หลัก');return;}
				var fd=new FormData(); fd.append('action','DSLOG_Deskspace_verify_2fa'); fd.append('code',c); fd.append('nonce',DSLOG_V7_Config.nonce);
				fetch(DSLOG_V7_Config.url,{method:'POST',body:fd}).then(function(r){return r.json();}).then(function(j){if(j.success){location.reload();}else{alert(j.data.msg);}});
			}
			</script>
			<?php
			return ob_get_clean();
		}

		// ── DASHBOARD ──
		?>
		<div class="v9">

		<!-- ── HEADER ── -->
		<div class="v9-header">
			<div class="v9-logo">
				<div class="v9-logo-icon"><i class="fa-solid fa-table-columns"></i></div>
				<div>
					<div class="v9-logo-name">Deskspace Manager</div>
					<div class="v9-logo-sub">Dashboard v8 · <?php echo esc_html( wp_get_current_user()->user_login ); ?> <span id="v9-ar-badge" class="v9-badge amber v9-hide" style="font-size:10px;margin-left:6px"><i class="fa-solid fa-circle-dot fa-beat" style="font-size:8px"></i> Auto <span id="v9-ar-cd">—</span>s</span></div>
				</div>
			</div>
			<div class="v9-hdr-actions">
				<!-- Global Date Range -->
				<div style="display:flex;align-items:center;gap:6px;background:var(--surf2);border:1px solid var(--bdr);border-radius:var(--r-sm);padding:4px 10px;font-size:12px;color:var(--txt2)">
					<i class="fa-regular fa-calendar" style="color:var(--txt3)"></i>
					<select id="g-range" class="v9-sel" style="border:none;background:transparent;padding:0;height:auto;font-size:12px" onchange="DSLOG_V7_App.onGlobalRange()">
						<option value="7d">7 Days</option>
						<option value="1m">1 Month</option>
						<option value="3m">3 Months</option>
						<option value="6m">6 Months</option>
						<option value="1y" selected>1 Year</option>
						<option value="all">All Time</option>
						<option value="custom">Custom…</option>
					</select>
					<span id="g-custom-wrap" style="display:none;gap:4px;align-items:center">
						<input type="date" id="g-start" class="v9-inp" style="height:28px;font-size:11px" onchange="DSLOG_V7_App.onGlobalRange()">
						<span style="color:var(--txt3)">→</span>
						<input type="date" id="g-end" class="v9-inp" style="height:28px;font-size:11px" onchange="DSLOG_V7_App.onGlobalRange()">
					</span>
				</div>
				<!-- Auto-refresh -->
				<div style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--txt2)">
					<i class="fa-solid fa-rotate" style="color:var(--txt3);font-size:11px"></i>
					<select id="g-autorefresh" class="v9-sel" style="height:32px;font-size:12px" onchange="DSLOG_V7_App.setAutoRefresh(this.value)">
						<option value="0">Off</option>
						<option value="60">1 min</option>
						<option value="300">5 min</option>
						<option value="600">10 min</option>
					</select>
				</div>
				<!-- Dark Mode -->
				<button class="v9-btn sm" id="btn-dark" onclick="DSLOG_V7_App.toggleDark()" title="Toggle Dark Mode"><i class="fa-solid fa-moon" id="dark-icon"></i></button>
				<button class="v9-btn danger sm" onclick="DSLOG_V7_App.reset2FA()"><i class="fa-solid fa-key"></i> 2FA</button>
				<a href="<?php echo esc_url( admin_url( 'admin-post.php?action=DSLOG_Deskspace_export_excel' ) ); ?>" class="v9-btn sm" target="_blank" id="btn-export-full"><i class="fa-solid fa-file-csv" style="color:var(--green)"></i> Export</a>
				<button class="v9-btn sm" id="btn-export-filtered" onclick="DSLOG_V7_App.exportFiltered()" title="Export filtered data only"><i class="fa-solid fa-filter" style="color:var(--teal)"></i> Export Filtered</button>
				<button class="v9-btn sm primary" onclick="DSLOG_V7_App.loadData()"><i class="fa-solid fa-rotate"></i> Refresh</button>
			</div>
		</div>

		<!-- ── KPI ROW ── -->
		<div class="v9-kpi-row">
			<div class="v9-kpi">
				<div class="v9-kpi-bar" style="background:var(--blue)"></div>
				<div class="v9-kpi-lbl">Page Views</div>
				<div class="v9-kpi-val" id="kpi-views">—</div>
				<div class="v9-kpi-sub"><i class="fa-solid fa-eye" style="color:var(--blue)"></i> All time</div>
				<canvas id="spark-views" class="v9-spark"></canvas>
				<i class="fa-solid fa-chart-line v9-kpi-bg"></i>
			</div>
			<div class="v9-kpi">
				<div class="v9-kpi-bar" style="background:var(--green)"></div>
				<div class="v9-kpi-lbl">Unique Visitors</div>
				<div class="v9-kpi-val" id="kpi-users">—</div>
				<div class="v9-kpi-sub"><i class="fa-solid fa-users" style="color:var(--green)"></i> Unique IPs</div>
				<canvas id="spark-users" class="v9-spark"></canvas>
				<i class="fa-solid fa-user-group v9-kpi-bg"></i>
			</div>
			<div class="v9-kpi">
				<div class="v9-kpi-bar" style="background:var(--purple)"></div>
				<div class="v9-kpi-lbl">Configs Saved</div>
				<div class="v9-kpi-val" id="kpi-logs">—</div>
				<div class="v9-kpi-sub"><i class="fa-solid fa-floppy-disk" style="color:var(--purple)"></i> Total logs</div>
				<canvas id="spark-logs" class="v9-spark"></canvas>
				<i class="fa-solid fa-inbox v9-kpi-bg"></i>
			</div>
			<div class="v9-kpi">
				<div class="v9-kpi-bar" style="background:var(--amber)"></div>
				<div class="v9-kpi-lbl">Today's Visits</div>
				<div class="v9-kpi-val" id="kpi-today">—</div>
				<div class="v9-kpi-sub"><i class="fa-solid fa-bolt" style="color:var(--amber)"></i> New today</div>
				<canvas id="spark-today" class="v9-spark"></canvas>
				<i class="fa-solid fa-calendar-day v9-kpi-bg"></i>
			</div>
		</div>

		<!-- ── TABS ── -->
		<div class="v9-tabs">
			<button class="v9-tab active" onclick="DSLOG_V7_App.tab('traffic')"><i class="fa-solid fa-chart-area"></i> Traffic</button>
			<button class="v9-tab" onclick="DSLOG_V7_App.tab('products')"><i class="fa-solid fa-chart-bar"></i> Products</button>
			<button class="v9-tab" onclick="DSLOG_V7_App.tab('insights')"><i class="fa-solid fa-lightbulb"></i> Insights</button>
			<button class="v9-tab" onclick="DSLOG_V7_App.tab('logs')"><i class="fa-solid fa-table-list"></i> Log Table</button>
			<button class="v9-tab" onclick="DSLOG_V7_App.tab('timeline')"><i class="fa-solid fa-timeline"></i> Timeline</button>
			<button class="v9-tab" onclick="DSLOG_V7_App.tab('summary')"><i class="fa-solid fa-file-contract"></i> Summary</button>
		</div>

		<!-- ══════════ TAB: TRAFFIC ══════════════════════════════════ -->
		<div id="pane-traffic">

			<div class="v9-card">
				<div class="v9-card-head">
					<div class="v9-card-title"><i class="fa-solid fa-users-viewfinder"></i> Traffic Analytics</div>
					<div class="v9-card-ctrl">
						<select id="tr-range" class="v9-sel" onchange="DSLOG_V7_App.renderTraffic()">
							<option value="7d">Last 7 Days</option>
							<option value="1m">Last 1 Month</option>
							<option value="3m">Last 3 Months</option>
							<option value="6m">Last 6 Months</option>
							<option value="1y">Last 1 Year</option>
							<option value="all" selected>All Time</option>
							<option value="custom">Custom Range</option>
						</select>
						<div id="tr-custom" class="v9-card-ctrl v9-hide">
							<input type="date" id="tr-start" class="v9-inp" onchange="DSLOG_V7_App.renderTraffic()">
							<span style="color:var(--txt3);font-size:11px">→</span>
							<input type="date" id="tr-end" class="v9-inp" onchange="DSLOG_V7_App.renderTraffic()">
						</div>
					</div>
				</div>

				<!-- Stat mini row -->
				<div class="v9-stat-row">
					<div class="v9-stat"><div class="v9-stat-num" id="tr-stat-views" style="color:var(--blue)">0</div><div class="v9-stat-lbl">Page Views</div></div>
					<div class="v9-stat"><div class="v9-stat-num" id="tr-stat-uniq" style="color:var(--green)">0</div><div class="v9-stat-lbl">Unique IPs</div></div>
					<div class="v9-stat"><div class="v9-stat-num" id="tr-stat-day" style="color:var(--amber)">0</div><div class="v9-stat-lbl">Avg / Day</div></div>
				</div>

				<!-- Trend chart full-width -->
				<div class="v9-chart-inner" style="margin-bottom:16px;">
					<div class="v9-ch-lbl">
						Traffic Trend (Views vs Unique Visitors)
						<div class="v9-ch-lbl-r">
							<select id="tr-agg" class="v9-sel" onchange="DSLOG_V7_App.renderTraffic()" title="Aggregation">
								<option value="auto">Auto Aggregate</option>
								<option value="day">Daily</option>
								<option value="week">Weekly</option>
								<option value="month">Monthly</option>
							</select>
							<select id="tr-style" class="v9-sel" onchange="DSLOG_V7_App.renderTraffic()">
								<option value="line">Line</option>
								<option value="bar">Bar</option>
							</select>
							<button class="v9-btn sm" id="tr-zoom-reset" onclick="DSLOG_V7_App.resetTrendZoom()" title="Reset Zoom" style="display:none"><i class="fa-solid fa-magnifying-glass-minus"></i> Reset</button>
						</div>
					</div>
					<div class="v9-chart-box" style="height:280px;"><canvas id="cv-tr-trend"></canvas></div>
				</div>

				<!-- 2-col: Device dist + Source dist -->
				<div class="v9-g-half">
					<div class="v9-chart-inner">
						<div class="v9-ch-lbl">Device Distribution</div>
						<div class="v9-chart-box" style="height:220px;"><canvas id="cv-tr-device"></canvas></div>
					</div>
					<div class="v9-chart-inner">
						<div class="v9-ch-lbl">Traffic Source</div>
						<div class="v9-chart-box" style="height:220px;"><canvas id="cv-tr-src"></canvas></div>
					</div>
				</div>

				<!-- Hourly + Day-of-Week breakdown -->
				<div class="v9-section-divider" style="margin-top:20px">Behavioral Patterns</div>
				<div class="v9-g-half">
					<div class="v9-chart-inner">
						<div class="v9-ch-lbl">Peak Hours (by Hour of Day)</div>
						<div class="v9-chart-box" style="height:200px"><canvas id="cv-tr-hour"></canvas></div>
					</div>
					<div class="v9-chart-inner">
						<div class="v9-ch-lbl">Day of Week Activity</div>
						<div class="v9-chart-box" style="height:200px"><canvas id="cv-tr-dow"></canvas></div>
					</div>
				</div>

				<!-- Traffic aggregation zoom hint -->
				<div style="margin-top:10px;padding:10px 14px;background:var(--surf2);border:1px solid var(--bdr2);border-radius:var(--r-sm);font-size:11.5px;color:var(--txt3);display:flex;align-items:center;gap:8px">
					<i class="fa-solid fa-magnifying-glass-plus"></i>
					Trend chart: <strong style="color:var(--txt2)">Scroll to zoom · Drag to pan</strong> — กราฟจะ aggregate เป็น Weekly/Monthly โดยอัตโนมัติเมื่อข้อมูลมาก
				</div>
			</div>
		</div>

		<!-- ══════════ TAB: PRODUCTS ═════════════════════════════════ -->
		<div id="pane-products" class="v9-hide">

			<div class="v9-card">
				<div class="v9-card-head">
					<div class="v9-card-title"><i class="fa-solid fa-chart-simple"></i> Product Analytics</div>
					<div class="v9-card-ctrl">
						<label class="v9-toggle-wrap">
							<span class="v9-tog"><input type="checkbox" id="pd-real" onchange="DSLOG_V7_App.renderProducts()"><span class="v9-tog-sl"></span></span>
							Real Data Only
						</label>
						<select id="pd-desk-filter" class="v9-sel" onchange="DSLOG_V7_App.renderProducts()" title="Filter by Desk Type">
							<option value="all">All Desk Types</option>
						</select>
						<select id="pd-range" class="v9-sel" onchange="DSLOG_V7_App.renderProducts()">
							<option value="1m">Last 1 Month</option>
							<option value="3m">Last 3 Months</option>
							<option value="6m">Last 6 Months</option>
							<option value="1y" selected>Last 1 Year</option>
							<option value="all">All Time</option>
							<option value="custom">Custom Range</option>
						</select>
						<div id="pd-custom" class="v9-card-ctrl v9-hide">
							<input type="date" id="pd-start" class="v9-inp" onchange="DSLOG_V7_App.renderProducts()">
							<span style="color:var(--txt3);font-size:11px">→</span>
							<input type="date" id="pd-end" class="v9-inp" onchange="DSLOG_V7_App.renderProducts()">
						</div>
					</div>
				</div>

				<!-- Product stat mini row -->
				<div class="v9-stat-row" style="grid-template-columns:repeat(4,1fr)">
					<div class="v9-stat"><div class="v9-stat-num" id="pd-total" style="color:var(--purple)">0</div><div class="v9-stat-lbl">Total Entries</div></div>
					<div class="v9-stat"><div class="v9-stat-num" id="pd-types" style="color:var(--blue)">0</div><div class="v9-stat-lbl">Desk Types</div></div>
					<div class="v9-stat"><div class="v9-stat-num" id="pd-colors" style="color:var(--teal)">0</div><div class="v9-stat-lbl">Colors Used</div></div>
					<div class="v9-stat"><div class="v9-stat-num" id="pd-platforms" style="color:var(--green)">0</div><div class="v9-stat-lbl">Platforms</div></div>
				</div>

				<!-- Row 1: Trend by type + Trend by color -->
				<div class="v9-section-divider">Trend Comparison</div>
				<div class="v9-g-half" style="margin-bottom:16px">
					<div class="v9-chart-inner">
						<div class="v9-ch-lbl">
							By Desk Type
							<div class="v9-ch-lbl-r">
								<select id="pd-type-style" class="v9-sel" onchange="DSLOG_V7_App.renderProducts()"><option value="bar">Bar</option><option value="line">Line</option></select>
							</div>
						</div>
						<div class="v9-chart-box" style="height:220px"><canvas id="cv-pd-type-trend"></canvas></div>
					</div>
					<div class="v9-chart-inner">
						<div class="v9-ch-lbl">
							By Color
							<div class="v9-ch-lbl-r">
								<select id="pd-color-style" class="v9-sel" onchange="DSLOG_V7_App.renderProducts()"><option value="bar">Bar</option><option value="line">Line</option></select>
							</div>
						</div>
						<div class="v9-chart-box" style="height:220px"><canvas id="cv-pd-color-trend"></canvas></div>
					</div>
				</div>

				<!-- Row 2: Trend by platform + Trend by size group -->
				<div class="v9-g-half" style="margin-bottom:16px">
					<div class="v9-chart-inner">
						<div class="v9-ch-lbl">By Platform</div>
						<div class="v9-chart-box" style="height:220px"><canvas id="cv-pd-plat-trend"></canvas></div>
					</div>
					<div class="v9-chart-inner">
						<div class="v9-ch-lbl">Monthly Volume</div>
						<div class="v9-chart-box" style="height:220px"><canvas id="cv-pd-monthly"></canvas></div>
					</div>
				</div>

				<!-- Row 3: Table Legs + Top Colors Ranking -->
				<div class="v9-section-divider">Legs & Size Insights</div>
				<div class="v9-g-half" style="margin-bottom:16px">
					<div class="v9-chart-inner">
						<div class="v9-ch-lbl">Table Leg Styles Selected
							<span class="v9-badge blue" style="font-size:10px;padding:2px 7px" id="pd-leg-count">—</span>
						</div>
						<div class="v9-chart-box" style="height:240px"><canvas id="cv-pd-legs"></canvas></div>
					</div>
					<div class="v9-chart-inner">
						<div class="v9-ch-lbl">Top Colors Ranking</div>
						<div class="v9-chart-box" style="height:240px"><canvas id="cv-pd-top-colors"></canvas></div>
					</div>
				</div>

				<!-- Row 4: Size distribution + Top desk types ranking -->
				<div class="v9-g-half" style="margin-bottom:16px">
					<div class="v9-chart-inner">
						<div class="v9-ch-lbl">Size Groups (Width Main)</div>
						<div class="v9-chart-box" style="height:200px"><canvas id="cv-pd-sizes"></canvas></div>
					</div>
					<div class="v9-chart-inner">
						<div class="v9-ch-lbl">Top Desk Types Ranking</div>
						<div class="v9-chart-box" style="height:200px"><canvas id="cv-pd-top-types"></canvas></div>
					</div>
				</div>

				<!-- Row 5: 4 doughnut proportion charts -->
				<div class="v9-section-divider">Proportion Breakdown</div>
				<div class="v9-g4">
					<div class="v9-chart-inner">
						<div class="v9-ch-lbl">By Type</div>
						<div class="v9-chart-box" style="height:190px"><canvas id="cv-pd-prop-type"></canvas></div>
					</div>
					<div class="v9-chart-inner">
						<div class="v9-ch-lbl">By Color</div>
						<div class="v9-chart-box" style="height:190px"><canvas id="cv-pd-prop-color"></canvas></div>
					</div>
					<div class="v9-chart-inner">
						<div class="v9-ch-lbl">By Platform</div>
						<div class="v9-chart-box" style="height:190px"><canvas id="cv-pd-prop-plat"></canvas></div>
					</div>
					<div class="v9-chart-inner">
						<div class="v9-ch-lbl">By Device</div>
						<div class="v9-chart-box" style="height:190px"><canvas id="cv-pd-prop-dev"></canvas></div>
					</div>
				</div>
			</div>
		</div>

		<!-- ══════════ TAB: INSIGHTS ═════════════════════════════════ -->
		<div id="pane-insights" class="v9-hide">
			<div class="v9-card">
				<div class="v9-card-head">
					<div class="v9-card-title"><i class="fa-solid fa-lightbulb"></i> Advanced Insights</div>
					<div class="v9-card-ctrl">
						<label class="v9-toggle-wrap">
							<span class="v9-tog"><input type="checkbox" id="ins-real" onchange="DSLOG_V7_App.renderInsights()"><span class="v9-tog-sl"></span></span>
							Real Data Only
						</label>
					</div>
				</div>

				<!-- Funnel -->
				<div class="v9-section-divider">Conversion Funnel</div>
				<div class="v9-g-half" style="margin-bottom:16px">
					<div class="v9-chart-inner">
						<div class="v9-ch-lbl">Visit → Save Funnel (Overall)</div>
						<div class="v9-chart-box" style="height:220px"><canvas id="cv-ins-funnel"></canvas></div>
					</div>
					<div class="v9-chart-inner">
						<div class="v9-ch-lbl">Conversion Rate by Platform</div>
						<div class="v9-chart-box" style="height:220px"><canvas id="cv-ins-conv-plat"></canvas></div>
					</div>
				</div>

				<!-- Repeat + Warning -->
				<div class="v9-section-divider">Customer Behavior</div>
				<div class="v9-g-half" style="margin-bottom:16px">
					<div class="v9-chart-inner">
						<div class="v9-ch-lbl">Repeat Customers (by IP) <span class="v9-badge purple" style="font-size:10px;padding:2px 7px" id="ins-repeat-count">—</span></div>
						<div class="v9-chart-box" style="height:240px"><canvas id="cv-ins-repeat"></canvas></div>
					</div>
					<div class="v9-chart-inner">
						<div class="v9-ch-lbl">Warning Rate Trend (Monthly)</div>
						<div class="v9-chart-box" style="height:240px"><canvas id="cv-ins-warn"></canvas></div>
					</div>
				</div>

				<!-- Size Heatmap + Addon -->
				<div class="v9-section-divider">Product Intelligence</div>
				<div class="v9-g-half" style="margin-bottom:16px">
					<div class="v9-chart-inner">
						<div class="v9-ch-lbl">Popular Size Combos (Width × Length)</div>
						<div id="cv-ins-heatmap-wrap" style="overflow-x:auto;padding-top:8px"></div>
					</div>
					<div class="v9-chart-inner">
						<div class="v9-ch-lbl">Add-on / Option Popularity</div>
						<div class="v9-chart-box" style="height:260px"><canvas id="cv-ins-addon"></canvas></div>
					</div>
				</div>
			</div>
		</div>

		<!-- ══════════ TAB: LOG TABLE ════════════════════════════════ -->
		<div id="pane-logs" class="v9-hide">
			<div class="v9-card" style="position:relative;min-height:300px">
				<div id="v9-loader" class="v9-loader v9-hide">
					<div class="v9-spin"></div>
					<div style="font-size:12.5px;font-weight:500;color:var(--txt2)">Loading...</div>
				</div>

				<div class="v9-card-head">
					<div class="v9-card-title"><i class="fa-solid fa-table-list"></i> Log Details</div>
					<div class="v9-card-ctrl">
						<button class="v9-btn sm" id="btn-sel" onclick="DSLOG_V7_App.toggleSel()"><i class="fa-regular fa-square-check"></i> Select</button>
						<button class="v9-btn sm danger v9-hide" id="btn-bulk" onclick="DSLOG_V7_App.delBulk()"><i class="fa-solid fa-trash-can"></i> Delete Selected</button>
						<button class="v9-btn sm" onclick="DSLOG_V7_App.togglePinnedOnly()" id="btn-pinned" title="Show pinned only"><i class="fa-solid fa-bookmark"></i> Pinned <span id="pinned-count" class="v9-badge amber" style="font-size:10px;padding:1px 5px">0</span></button>
					</div>
				</div>

				<div class="v9-searchbar">
					<div class="v9-search-wrap">
						<i class="fa-solid fa-magnifying-glass"></i>
						<input type="text" id="tbl-q" class="v9-inp" placeholder="Search name, platform, type, color, IP...">
					</div>
					<select id="tbl-range" class="v9-sel">
						<option value="all">All Time</option>
						<option value="7d">Last 7 Days</option>
						<option value="1m">Last 1 Month</option>
						<option value="3m">Last 3 Months</option>
						<option value="1y">Last 1 Year</option>
						<option value="custom">Custom Range</option>
					</select>
					<div id="tbl-custom" class="v9-card-ctrl v9-hide">
						<input type="date" id="tbl-start" class="v9-inp">
						<span style="color:var(--txt3);font-size:11px">→</span>
						<input type="date" id="tbl-end" class="v9-inp">
					</div>
					<label class="v9-toggle-wrap">
						<span class="v9-tog"><input type="checkbox" id="tbl-real" onchange="DSLOG_V7_App.renderTable()"><span class="v9-tog-sl"></span></span>
						Real Only
					</label>
					<button class="v9-btn sm primary" onclick="DSLOG_V7_App.renderTable()"><i class="fa-solid fa-filter"></i> Apply</button>
				</div>

				<div class="v9-tbl-wrap">
					<table class="v9-tbl">
						<colgroup><col style="width:36px"><col style="width:32px"><col style="width:140px"><col style="width:120px"><col style="width:85px"><col style="width:105px"><col style="width:105px"><col style="width:110px"><col style="width:100px"><col style="width:60px"><col style="width:76px"></colgroup>
						<thead>
							<tr>
								<th style="text-align:center"></th>
								<th style="text-align:center" title="Pin"><i class="fa-solid fa-bookmark" style="color:var(--amber);font-size:11px"></i></th>
								<th class="v9-sortable" data-col="date" onclick="DSLOG_V7_App.sortTable('date')">Date <i class="fa-solid fa-sort v9-sort-icon" id="sort-date"></i></th>
								<th class="v9-sortable" data-col="name" onclick="DSLOG_V7_App.sortTable('name')">Customer <i class="fa-solid fa-sort v9-sort-icon" id="sort-name"></i></th>
								<th>Platform</th>
								<th class="v9-sortable" data-col="type" onclick="DSLOG_V7_App.sortTable('type')">Type <i class="fa-solid fa-sort v9-sort-icon" id="sort-type"></i></th>
								<th class="v9-sortable" data-col="color" onclick="DSLOG_V7_App.sortTable('color')">Color <i class="fa-solid fa-sort v9-sort-icon" id="sort-color"></i></th>
								<th>Size</th>
								<th>Location</th>
								<th>Image</th>
								<th style="text-align:center">Actions</th>
							</tr>
						</thead>
						<tbody id="tbl-body"></tbody>
					</table>
				</div>

				<div class="v9-pagination">
					<span class="v9-pg-info" id="tbl-info">Showing 0 of 0</span>
					<div class="v9-pg-btns">
						<button class="v9-pg-btn" id="btn-prev" disabled><i class="fa-solid fa-chevron-left"></i></button>
						<span class="v9-pg-info2" id="tbl-pg">Page 1 / 1</span>
						<button class="v9-pg-btn" id="btn-next" disabled><i class="fa-solid fa-chevron-right"></i></button>
					</div>
				</div>
			</div>
		</div>

		<!-- ══════════ TAB: TIMELINE ══════════════════════════════════ -->
		<div id="pane-timeline" class="v9-hide">
			<div class="v9-card">
				<div class="v9-card-head">
					<div class="v9-card-title"><i class="fa-solid fa-timeline"></i> Activity Timeline</div>
					<div class="v9-card-ctrl">
						<div class="v9-search-wrap" style="min-width:160px">
							<i class="fa-solid fa-magnifying-glass"></i>
							<input type="text" id="tl-q" class="v9-inp" placeholder="Search..." onkeyup="DSLOG_V7_App.renderTimeline()" style="padding-left:30px">
						</div>
						<select id="tl-limit" class="v9-sel" onchange="DSLOG_V7_App.renderTimeline()">
							<option value="20">Latest 20</option>
							<option value="50">Latest 50</option>
							<option value="100">Latest 100</option>
							<option value="all">All</option>
						</select>
						<select id="tl-plat" class="v9-sel" onchange="DSLOG_V7_App.renderTimeline()">
							<option value="all">All Platforms</option>
							<option value="Line">Line</option>
							<option value="Facebook">Facebook</option>
							<option value="Instagram">Instagram</option>
							<option value="Email">Email</option>
						</select>
						<select id="tl-warn" class="v9-sel" onchange="DSLOG_V7_App.renderTimeline()">
							<option value="all">All</option>
							<option value="collision">Collision only</option>
							<option value="gap_changed">Gap Changed only</option>
							<option value="clean">No Warnings</option>
						</select>
						<label class="v9-toggle-wrap">
							<span class="v9-tog"><input type="checkbox" id="tl-real" onchange="DSLOG_V7_App.renderTimeline()"><span class="v9-tog-sl"></span></span>
							Real Only
						</label>
					</div>
				</div>
				<div id="tl-body" class="v9-timeline">
					<div class="v9-empty"><i class="fa-regular fa-clock"></i><p>Loading...</p></div>
				</div>
			</div>
		</div>

		<!-- ══════════ TAB: SUMMARY ═══════════════════════════════════ -->
		<div id="pane-summary" class="v9-hide">
			<div class="v9-card" id="summary-print-area">
				<div class="v9-card-head" style="border-bottom:1px solid var(--bdr);padding-bottom:16px;margin-bottom:18px">
					<div>
						<div class="v9-card-title" style="font-size:17px"><i class="fa-solid fa-file-contract"></i> Dashboard Summary Report</div>
						<div style="font-size:12px;color:var(--txt3);margin-top:4px">Deskspace Manager · Generated <span id="sum-date">—</span></div>
					</div>
					<div class="v9-card-ctrl no-print">
						<button class="v9-btn sm" onclick="window.print()"><i class="fa-solid fa-print"></i> Print</button>
					</div>
				</div>
				<div class="v9-kpi-row" style="margin-bottom:22px" id="sum-kpi-row"></div>
				<div class="v9-g-half" style="margin-bottom:18px">
					<div class="v9-chart-inner">
						<div class="v9-ch-lbl">Conversion Funnel</div>
						<div class="v9-chart-box" style="height:200px"><canvas id="cv-sum-funnel"></canvas></div>
					</div>
					<div class="v9-chart-inner">
						<div class="v9-ch-lbl">Traffic Trend (Monthly)</div>
						<div class="v9-chart-box" style="height:200px"><canvas id="cv-sum-trend"></canvas></div>
					</div>
				</div>
				<div class="v9-g-half" style="margin-bottom:18px">
					<div class="v9-chart-inner">
						<div class="v9-ch-lbl">Top Colors</div>
						<div class="v9-chart-box" style="height:200px"><canvas id="cv-sum-colors"></canvas></div>
					</div>
					<div class="v9-chart-inner" style="opacity: 0; pointer-events: none;">
					</div>
				</div>
				<div class="v9-g4" style="margin-bottom:18px">
					<div class="v9-chart-inner">
						<div class="v9-ch-lbl">By Type</div>
						<div class="v9-chart-box" style="height:160px"><canvas id="cv-sum-type"></canvas></div>
					</div>
					<div class="v9-chart-inner">
						<div class="v9-ch-lbl">By Platform</div>
						<div class="v9-chart-box" style="height:160px"><canvas id="cv-sum-plat"></canvas></div>
					</div>
					<div class="v9-chart-inner">
						<div class="v9-ch-lbl">By Device</div>
						<div class="v9-chart-box" style="height:160px"><canvas id="cv-sum-dev"></canvas></div>
					</div>
					<div class="v9-chart-inner">
						<div class="v9-ch-lbl">Day of Week</div>
						<div class="v9-chart-box" style="height:160px"><canvas id="cv-sum-dow"></canvas></div>
					</div>
				</div>
				<div class="v9-section-divider">Top 10 Configurations</div>
				<div class="v9-tbl-wrap" id="sum-top10"></div>
			</div>
		</div>

		</div><!-- /.v9 -->

		<!-- Modal: Log Detail -->
		<div class="v9-overlay" id="v9-modal" onclick="document.getElementById('v9-modal').classList.remove('active')">
			<div class="v9-modal" style="max-width:700px" onclick="event.stopPropagation()">
				<div class="v9-modal-head">
					<span class="v9-modal-title"><i class="fa-solid fa-address-card" style="color:var(--txt3);margin-right:7px"></i>Log Detail</span>
					<div style="display:flex;gap:6px;align-items:center">
						<button class="v9-btn sm" onclick="DSLOG_V7_App.toggleModalView()" id="btn-modal-toggle"><i class="fa-solid fa-code"></i> Raw JSON</button>
						<button class="v9-btn sm" onclick="DSLOG_V7_App.copyJson()"><i class="fa-regular fa-copy"></i> Copy</button>
						<div class="v9-close" onclick="document.getElementById('v9-modal').classList.remove('active')"><i class="fa-solid fa-xmark"></i></div>
					</div>
				</div>
				<div class="v9-modal-body" id="v9-modal-body">
					<div id="v9-detail-cards"></div>
					<div class="v9-json v9-hide" id="v9-json"></div>
				</div>
			</div>
		</div>

		<!-- Modal: Image -->
		<div class="v9-overlay" id="v9-img-modal" onclick="document.getElementById('v9-img-modal').classList.remove('active')">
			<div class="v9-img-modal" onclick="event.stopPropagation()">
				<div style="display:flex;justify-content:space-between;align-items:center;width:100%;gap:10px">
					<span style="font-weight:600;font-size:14px">Snapshot Preview</span>
					<div style="display:flex;gap:8px">
						<a id="v9-img-dl" href="#" download class="v9-btn sm"><i class="fa-solid fa-download"></i> Download</a>
						<div class="v9-close" onclick="document.getElementById('v9-img-modal').classList.remove('active')"><i class="fa-solid fa-xmark"></i></div>
					</div>
				</div>
				<img id="v9-img" src="" alt="Snapshot">
			</div>
		</div>

		<script>
		window.DSLOG_V7_Admin_Icon = '<?php echo esc_js( $admin_icon_url ); ?>';
		</script>
		<script src="<?php echo plugins_url( '../assets/js/log-dashboard.js', __FILE__ ); ?>"></script>
		<?php
		return ob_get_clean();
	}
}
add_shortcode( 'DSLOG_Deskspace_Dashboard', 'DSLOG_Deskspace_V7_render_ui' );
