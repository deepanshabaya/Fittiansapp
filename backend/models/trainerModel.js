const { query } = require('../config/db');

const createTrainer = async ({
  userId,
  experienceYears,
  specialization,
  bio,
  certifications = '[]',
  certificationAcademy = null,
  introductionVideoUrl = null,
}) => {
  const result = await query(
    `INSERT INTO trainers
      (user_id, bio, experience, specialization, certifications, certification_academy, introduction_video_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      userId,
      bio,
      experienceYears,
      specialization,
      certifications,
      certificationAcademy,
      introductionVideoUrl,
    ]
  );
  return result.rows[0];
};

const getTrainerByUserId = async (userId) => {
  const result = await query(
    'SELECT * FROM trainers WHERE user_id = $1',
    [userId]
  );
  return result.rows[0];
};

const approveTrainer = async (trainerId) => {
  const result = await query(
    'UPDATE trainers SET is_approved = true WHERE id = $1 RETURNING *',
    [trainerId]
  );
  return result.rows[0];
};

const rejectTrainer = async (trainerId) => {
  const result = await query(
    'UPDATE trainers SET is_approved = false WHERE id = $1 RETURNING *',
    [trainerId]
  );
  return result.rows[0];
};

const getPendingTrainers = async () => {
  const result = await query(
    `SELECT t.*, u.email
     FROM trainers t
     JOIN users u ON u.id = t.user_id
     ORDER BY t.id DESC`
  );
  return result.rows;
};

const getTrainerById = async (trainerId) => {
  const result = await query(
    'SELECT * FROM trainers WHERE id = $1',
    [trainerId]
  );
  return result.rows[0];
};

const updateIntroductionVideoUrl = async ({ trainerId, videoUrl }) => {
  const result = await query(
    'UPDATE trainers SET introduction_video_url = $2 WHERE id = $1 RETURNING *',
    [trainerId, videoUrl]
  );
  return result.rows[0];
};

module.exports = {
  createTrainer,
  getTrainerByUserId,
  approveTrainer,
  rejectTrainer,
  getPendingTrainers,
  getTrainerById,
  updateIntroductionVideoUrl,
};
