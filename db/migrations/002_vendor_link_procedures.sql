DROP PROCEDURE IF EXISTS sp_vendor_link_create;
DROP PROCEDURE IF EXISTS sp_vendor_link_get;
DROP PROCEDURE IF EXISTS sp_vendor_link_list;
DROP PROCEDURE IF EXISTS sp_vendor_link_update;
DROP PROCEDURE IF EXISTS sp_vendor_link_delete;

DELIMITER $$

CREATE PROCEDURE sp_vendor_link_create(
  IN p_qb_vendor_id        VARCHAR(64),
  IN p_qb_vendor_name      VARCHAR(255),
  IN p_samsara_vendor_id   VARCHAR(64),
  IN p_samsara_vendor_name VARCHAR(255)
)
BEGIN
  INSERT INTO vendor_links (qb_vendor_id, qb_vendor_name, samsara_vendor_id, samsara_vendor_name)
  VALUES (p_qb_vendor_id, p_qb_vendor_name, p_samsara_vendor_id, p_samsara_vendor_name);

  SELECT id, qb_vendor_id, qb_vendor_name, samsara_vendor_id, samsara_vendor_name, created_at, updated_at
  FROM vendor_links
  WHERE id = LAST_INSERT_ID();
END$$

CREATE PROCEDURE sp_vendor_link_get(
  IN p_id INT UNSIGNED
)
BEGIN
  SELECT id, qb_vendor_id, qb_vendor_name, samsara_vendor_id, samsara_vendor_name, created_at, updated_at
  FROM vendor_links
  WHERE id = p_id;
END$$

-- Optional filters: pass NULL to ignore.
CREATE PROCEDURE sp_vendor_link_list(
  IN p_qb_vendor_id      VARCHAR(64),
  IN p_samsara_vendor_id VARCHAR(64)
)
BEGIN
  SELECT id, qb_vendor_id, qb_vendor_name, samsara_vendor_id, samsara_vendor_name, created_at, updated_at
  FROM vendor_links
  WHERE (p_qb_vendor_id IS NULL OR qb_vendor_id = p_qb_vendor_id)
    AND (p_samsara_vendor_id IS NULL OR samsara_vendor_id = p_samsara_vendor_id)
  ORDER BY id;
END$$

-- NULL arguments leave the existing column value unchanged.
CREATE PROCEDURE sp_vendor_link_update(
  IN p_id                  INT UNSIGNED,
  IN p_qb_vendor_id        VARCHAR(64),
  IN p_qb_vendor_name      VARCHAR(255),
  IN p_samsara_vendor_id   VARCHAR(64),
  IN p_samsara_vendor_name VARCHAR(255)
)
BEGIN
  UPDATE vendor_links
  SET qb_vendor_id        = COALESCE(p_qb_vendor_id, qb_vendor_id),
      qb_vendor_name      = COALESCE(p_qb_vendor_name, qb_vendor_name),
      samsara_vendor_id   = COALESCE(p_samsara_vendor_id, samsara_vendor_id),
      samsara_vendor_name = COALESCE(p_samsara_vendor_name, samsara_vendor_name)
  WHERE id = p_id;

  SELECT id, qb_vendor_id, qb_vendor_name, samsara_vendor_id, samsara_vendor_name, created_at, updated_at
  FROM vendor_links
  WHERE id = p_id;
END$$

CREATE PROCEDURE sp_vendor_link_delete(
  IN p_id INT UNSIGNED
)
BEGIN
  DELETE FROM vendor_links WHERE id = p_id;
  SELECT ROW_COUNT() AS affected_rows;
END$$

DELIMITER ;
