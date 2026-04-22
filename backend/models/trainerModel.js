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
  getTrainerById,
  updateIntroductionVideoUrl,
};
