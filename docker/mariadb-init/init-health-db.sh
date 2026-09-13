#!/bin/bash
# Exécuté automatiquement par l'image MariaDB uniquement lors du tout premier
# démarrage (volume de données vide). Crée une base et un utilisateur dédiés
# pour l'historique santé (Garmin), séparés de la base Nextcloud.
set -e

mariadb -u root -p"$MYSQL_ROOT_PASSWORD" <<-EOSQL
    CREATE DATABASE IF NOT EXISTS health CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    CREATE USER IF NOT EXISTS 'health_app'@'%' IDENTIFIED BY '${HEALTH_DB_PASSWORD}';
    GRANT ALL PRIVILEGES ON health.* TO 'health_app'@'%';
    FLUSH PRIVILEGES;
EOSQL
