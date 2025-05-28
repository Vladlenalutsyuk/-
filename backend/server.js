// Добавить в начало файла
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors({ origin: ['http://localhost:5173'] }));

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'vladlena121512',
  database: 'children_platform', // Изменено на новую БД
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const db = mysql.createPool(dbConfig);
const JWT_SECRET = 'your_jwt_secret';

// Обновленная инициализация базы данных
const initializeDatabase = async () => {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    });

    await connection.query('CREATE DATABASE IF NOT EXISTS children_platform');
    await connection.query('USE children_platform');

    // Таблицы из новой структуры БД
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL DEFAULT '$2b$10$5xJ8z3k0Qz1p2X9r7vL4vO0t3Y5W8u9K2qM4nN6mP8rT0vW2xY3z',
        role ENUM('admin', 'parent', 'teacher', 'center_admin') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE
      )
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        category_id INT NOT NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
      )
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS centers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        address VARCHAR(255) NOT NULL,
        city VARCHAR(100) NOT NULL,
        phone VARCHAR(15),
        email VARCHAR(100),
        description TEXT,
        rating DECIMAL(3,1) DEFAULT 0.0,
        latitude DECIMAL(9,6),
        longitude DECIMAL(9,6),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS center_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        center_id INT NOT NULL,
        period ENUM('month', 'year') NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status ENUM('active', 'expired') NOT NULL,
        FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE
      )
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS parents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        phone VARCHAR(15),
        preferences JSON,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS teachers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        center_id INT NOT NULL,
        subject_id INT,
        phone VARCHAR(15),
        education VARCHAR(255),
        experience INT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT
      )
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS deleted_teachers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        username VARCHAR(50) NOT NULL,
        email VARCHAR(100) NOT NULL,
        center_id INT,
        subject_id INT,
        phone VARCHAR(15),
        education VARCHAR(255),
        experience INT,
        deleted_at DATETIME,
        FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE SET NULL,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
      )
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS children (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        birth_date DATE NOT NULL,
        gender ENUM('male', 'female', 'other') NOT NULL,
        parent_id INT NOT NULL,
        FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE
      )
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        center_id INT NOT NULL,
        name VARCHAR(50) NOT NULL,
        FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE,
        UNIQUE(center_id, name)
      )
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS classes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        center_id INT NOT NULL,
        subject_id INT NOT NULL,
        schedule DATETIME NOT NULL,
        teacher_id INT,
        room_id INT,
        price DECIMAL(10,2) DEFAULT 0.00,
        class_type ENUM('group', 'individual', 'online') NOT NULL,
        min_age INT NOT NULL DEFAULT 1,
        max_age INT NOT NULL DEFAULT 16,
        gender_restriction ENUM('male', 'female', 'none') DEFAULT 'none',
        max_capacity INT DEFAULT 20,
        completed BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT,
        FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
      )
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        child_id INT NOT NULL,
        class_id INT NOT NULL,
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        UNIQUE(child_id, class_id)
      )
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        enrollment_id INT NOT NULL,
        date DATE NOT NULL,
        status ENUM('present', 'absent', 'excused') NOT NULL,
        FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
        UNIQUE(enrollment_id, date)
      )
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        parent_id INT NOT NULL,
        center_id INT NOT NULL,
        class_id INT,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE,
        FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
      )
    `);
    await connection.query(`
      DROP PROCEDURE IF EXISTS EnrollChild;
    `);
    await connection.query(`
      CREATE PROCEDURE EnrollChild(
        IN p_class_id INT,
        IN p_child_id INT,
        OUT p_message VARCHAR(255)
      )
      BEGIN
        DECLARE v_min_age INT;
        DECLARE v_max_age INT;
        DECLARE v_gender_restriction ENUM('male', 'female', 'none');
        DECLARE v_class_type ENUM('group', 'individual', 'online');
        DECLARE v_birth_date DATE;
        DECLARE v_child_age INT;
        DECLARE v_child_gender ENUM('male', 'female', 'other');
        DECLARE v_class_exists INT;
        DECLARE v_max_capacity INT;
        DECLARE v_current_enrollments INT;

        SELECT COUNT(*) INTO v_class_exists FROM classes WHERE id = p_class_id;
        IF v_class_exists = 0 THEN
          SET p_message = 'Занятие не найдено';
          SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Занятие не найдено';
        END IF;
        SELECT min_age, max_age, gender_restriction, class_type, max_capacity
        INTO v_min_age, v_max_age, v_gender_restriction, v_class_type, v_max_capacity
        FROM classes
        WHERE id = p_class_id;
        SELECT birth_date, gender
        INTO v_birth_date, v_child_gender
        FROM children
        WHERE id = p_child_id;

        SET v_child_age = TIMESTAMPDIFF(YEAR, v_birth_date, CURDATE());

        IF v_child_age < v_min_age OR v_child_age > v_max_age THEN
          SET p_message = 'Возраст ребёнка не соответствует возрастным ограничениям';
          SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = p_message;
        END IF;

        IF v_gender_restriction != 'none' AND v_gender_restriction != v_child_gender THEN
          SET p_message = 'Пол ребёнка не соответствует ограничениям занятия';
          SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = p_message;
        END IF;

        SELECT COUNT(*) INTO v_current_enrollments FROM enrollments WHERE class_id = p_class_id;
        IF v_current_enrollments >= v_max_capacity THEN
          SET p_message = 'Максимальная вместимость занятия достигнута';
          SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = p_message;
        END IF;

        INSERT INTO enrollments(child_id, class_id)
        VALUES (p_child_id, p_class_id);

        SET p_message = 'Ребёнок успешно записан на занятие';
      END
    `);

    // Триггер для архивирования удаленных учителей
    await connection.query(`
      DROP TRIGGER IF EXISTS archive_teacher;
    `);
    await connection.query(`
      CREATE TRIGGER archive_teacher
      BEFORE DELETE ON teachers
      FOR EACH ROW
      BEGIN
        INSERT INTO deleted_teachers (user_id, username, email, center_id, subject_id, phone, education, experience, deleted_at)
        SELECT OLD.user_id, u.username, u.email, OLD.center_id, OLD.subject_id, OLD.phone, OLD.education, OLD.experience, NOW()
        FROM users u
        WHERE u.id = OLD.user_id;
      END
    `);

    // Инициализация тестовых данных
    const [admin] = await db.query('SELECT * FROM users WHERE role = "admin"');
    if (admin.length === 0) {
      const hashedPassword = await bcrypt.hash('123', 10);
      await db.query(`
        INSERT INTO users (username, email, password, role)
        VALUES ('admin', 'admin@example.com', ?, 'admin')
      `, [hashedPassword]);
    }

    const [categories] = await db.query('SELECT * FROM categories');
    if (categories.length === 0) {
      await db.query(`
        INSERT INTO categories (name) VALUES
        ('Спорт'), ('Творчество'), ('Наука'), ('Языки'), ('Музыка')
      `);
    }

    const [centers] = await db.query('SELECT * FROM centers');
    if (centers.length === 0) {
      await db.query(`
        INSERT INTO centers (name, address, city, phone, email, description, latitude, longitude)
        VALUES
        ('Солнышко', 'ул. Ленина, 10', 'Москва', '+79123456780', 'sun@example.com', 'Центр для детей 1–16 лет', 55.7558, 37.6173),
        ('Радуга', 'ул. Победы, 5', 'Санкт-Петербург', '+79123456781', 'rainbow@example.com', 'Творческие и спортивные занятия', 59.9343, 30.3351)
      `);
    }

    const [subjects] = await db.query('SELECT * FROM subjects');
    if (subjects.length === 0) {
      const [categories] = await db.query('SELECT id, name FROM categories');
      const categoryMap = Object.fromEntries(categories.map(c => [c.name, c.id]));
      await db.query(`
        INSERT INTO subjects (name, category_id) VALUES
        ('Математика', ?), ('Английский язык', ?), ('Рисование', ?), ('Футбол', ?), ('Фортепиано', ?)
      `, [categoryMap['Наука'], categoryMap['Языки'], categoryMap['Творчество'], categoryMap['Спорт'], categoryMap['Музыка']]);
    }

    const [centerAdmins] = await db.query('SELECT * FROM users WHERE role = "center_admin"');
    if (centerAdmins.length === 0) {
      const hashedPassword = await bcrypt.hash('123', 10);
      await db.query(`
        INSERT INTO users (username, email, password, role)
        VALUES ('center_admin1', 'center_admin1@example.com', ?, 'center_admin')
      `, [hashedPassword]);
    }

    const [parents] = await db.query('SELECT * FROM users WHERE role = "parent"');
    let parentId = 1;
    if (parents.length === 0) {
      const hashedPassword = await bcrypt.hash('123', 10);
      await db.query(`
        INSERT INTO users (username, email, password, role)
        VALUES ('parent1', 'parent1@example.com', ?, 'parent')
      `, [hashedPassword]);

      const [userResult] = await db.query('SELECT id FROM users WHERE username = "parent1"');
      const userId = userResult[0].id;

      await db.query(`
        INSERT INTO parents (user_id, phone, preferences)
        VALUES (?, '1234567890', ?)
      `, [userId, JSON.stringify({ city: 'Москва', categories: ['Творчество', 'Языки'] })]);

      const [parentResult] = await db.query('SELECT id FROM parents WHERE user_id = ?', [userId]);
      parentId = parentResult[0].id;
    }

    const [teachers] = await db.query('SELECT * FROM teachers');
    let teacherId = null;
    if (teachers.length === 0) {
      const hashedPassword = await bcrypt.hash('123', 10);
      await db.query(`
        INSERT INTO users (username, email, password, role)
        VALUES ('teacher1', 'teacher1@example.com', ?, 'teacher')
      `, [hashedPassword]);

      const [userResult] = await db.query('SELECT id FROM users WHERE username = "teacher1"');
      const userId = userResult[0].id;

      const [subjectResult] = await db.query('SELECT id FROM subjects WHERE name = "Математика"');
      const subjectId = subjectResult[0].id;

      const [centerResult] = await db.query('SELECT id FROM centers WHERE name = "Солнышко"');
      const centerId = centerResult[0].id;

      await db.query(`
        INSERT INTO teachers (user_id, center_id, subject_id, phone, education, experience)
        VALUES (?, ?, ?, '9876543210', 'Педагогическое образование', 5)
      `, [userId, centerId, subjectId]);

      const [teacherResult] = await db.query('SELECT id FROM teachers WHERE user_id = ?', [userId]);
      teacherId = teacherResult[0].id;
    }

    const [rooms] = await db.query('SELECT * FROM rooms');
    if (rooms.length === 0) {
      const [centerResult] = await db.query('SELECT id FROM centers WHERE name = "Солнышко"');
      const centerId = centerResult[0].id;
      await db.query(`
        INSERT INTO rooms (center_id, name)
        VALUES (?, 'Кабинет 101'), (?, 'Кабинет 102')
      `, [centerId, centerId]);
    }

    const [classes] = await db.query('SELECT * FROM classes');
    if (classes.length === 0) {
      const [subjectResult] = await db.query('SELECT id FROM subjects WHERE name = "Математика"');
      const subjectId = subjectResult[0].id;
      const [roomResult] = await db.query('SELECT id FROM rooms WHERE name = "Кабинет 101"');
      const roomId = roomResult[0].id;
      const [centerResult] = await db.query('SELECT id FROM centers WHERE name = "Солнышко"');
      const centerId = centerResult[0].id;

      await db.query(`
        INSERT INTO classes (center_id, subject_id, schedule, teacher_id, room_id, price, class_type, min_age, max_age, gender_restriction)
        VALUES
        (?, ?, '2025-06-01 10:00:00', ?, ?, 1000.00, 'group', 7, 11, 'none'),
        (?, ?, '2025-06-02 14:00:00', ?, ?, 1500.00, 'individual', 3, 16, 'none')
      `, [centerId, subjectId, teacherId, roomId, centerId, subjectId, teacherId, roomId]);
    }

    const [children] = await db.query('SELECT * FROM children');
    if (children.length === 0) {
      await db.query(`
        INSERT INTO children (name, birth_date, gender, parent_id)
        VALUES ('Иван Иванов', '2015-01-01', 'male', ?)
      `, [parentId]);
    }

    const [reviews] = await db.query('SELECT * FROM reviews');
    if (reviews.length === 0) {
      const [parentResult] = await db.query('SELECT id FROM parents WHERE user_id = (SELECT id FROM users WHERE username = "parent1")');
      const [centerResult] = await db.query('SELECT id FROM centers WHERE name = "Солнышко"');
      await db.query(`
        INSERT INTO reviews (parent_id, center_id, rating, content)
        VALUES
        (?, ?, 5, 'Отличный центр, ребёнок в восторге!'),
        (?, ?, 4, 'Учителя очень внимательные, рекомендуем!')
      `, [parentResult[0].id, centerResult[0].id, parentResult[0].id, centerResult[0].id]);
    }

    console.log('База данных успешно инициализирована');
  } catch (err) {
    console.error('Ошибка инициализации базы данных:', err.stack);
    throw err;
  } finally {
    if (connection) await connection.end();
  }
};

// Новые API-эндпоинты
app.get('/api/categories', async (req, res) => {
  try {
    const [categories] = await db.query('SELECT id, name FROM categories');
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.get('/api/centers', async (req, res) => {
  try {
    const [centers] = await db.query(`
      SELECT id, name, address, city, phone, email, description, rating, latitude, longitude
      FROM centers
    `);
    res.json(centers);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.get('/api/classes/public', async (req, res) => {
  try {
    const { age, gender, category_id, city, class_type } = req.query;
    let query = `
      SELECT c.id, s.name AS subject, c.schedule, c.class_type, c.min_age, c.max_age, c.price, r.name AS room,
             u.username AS teacher_name, ce.name AS center_name, ce.id AS center_id, ce.rating AS center_rating
      FROM classes c
      JOIN subjects s ON c.subject_id = s.id
      JOIN centers ce ON c.center_id = ce.id
      LEFT JOIN rooms r ON c.room_id = r.id
      LEFT JOIN teachers t ON c.teacher_id = t.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE c.schedule > NOW() AND c.completed = FALSE
    `;
    const params = [];

    if (age && !isNaN(age)) {
      query += ' AND c.min_age <= ? AND c.max_age >= ?';
      params.push(parseInt(age), parseInt(age));
    }
    if (gender && ['male', 'female'].includes(gender)) {
      query += ' AND (c.gender_restriction = ? OR c.gender_restriction = "none")';
      params.push(gender);
    }
    if (category_id && !isNaN(category_id)) {
      query += ' AND s.category_id = ?';
      params.push(parseInt(category_id));
    }
    if (city) {
      query += ' AND ce.city LIKE ?';
      params.push(`%${city}%`);
    }
    if (class_type && ['group', 'individual', 'online'].includes(class_type)) {
      query += ' AND c.class_type = ?';
      params.push(class_type);
    }

    query += ' ORDER BY c.schedule ASC';
    const [classes] = await db.query(query, params);
    res.json(classes);
  } catch (err) {
    console.error('Ошибка в /api/classes/public:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновленный middleware для проверки center_admin
const centerAdminOnly = async (req, res, next) => {
  if (req.user.role !== 'center_admin') return res.status(403).json({ error: 'Доступ только для администраторов центра' });
  const [admin] = await db.query('SELECT id FROM teachers WHERE user_id = ? AND role = "center_admin"', [req.user.id]);
  if (admin.length === 0) return res.status(404).json({ error: 'Администратор центра не найден' });
  req.centerAdminId = admin[0].id;
  next();
};

// Пример маршрута для администратора центра
app.get('/api/center/classes', authenticateToken, centerAdminOnly, async (req, res) => {
  try {
    const [center] = await db.query('SELECT id FROM centers WHERE center_admin_id = ?', [req.centerAdminId]);
    if (center.length === 0) return res.status(404).json({ error: 'Центр не найден' });
    const centerId = center[0].id;
    const [classes] = await db.query(`
      SELECT c.id, s.name AS subject, c.schedule, c.class_type, c.min_age, c.max_age, c.price, r.name AS room,
             u.username AS teacher_name
      FROM classes c
      JOIN subjects s ON c.subject_id = s.id
      LEFT JOIN rooms r ON c.room_id = r.id
      LEFT JOIN teachers t ON c.teacher_id = t.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE c.center_id = ?
    `, [centerId]);
    res.json(classes);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  try {
    await initializeDatabase();
    console.log(`Сервер запущен на порту ${PORT}`);
  } catch (err) {
    console.error('Не удалось запустить сервер:', err.stack);
    process.exit(1);
  }
});