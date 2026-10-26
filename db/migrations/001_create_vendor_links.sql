CREATE TABLE IF NOT EXISTS vendor_links (
  id                  INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  qb_vendor_id        VARCHAR(64)   NOT NULL,
  qb_vendor_name      VARCHAR(255)  NULL,
  samsara_vendor_id   VARCHAR(64)   NOT NULL,
  samsara_vendor_name VARCHAR(255)  NULL,
  created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_vendor_links_qb_vendor_id (qb_vendor_id),
  UNIQUE KEY uq_vendor_links_samsara_vendor_id (samsara_vendor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
