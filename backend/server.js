import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n  MRMS API running on http://localhost:${PORT}`);
  console.log(`  Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Frontend    : ${process.env.FRONTEND_ORIGIN}`);
  console.log('\n  Demo credentials:');
  console.log('    admin        / admin123      (Administrator)');
  console.log('    clinician    / clinic123     (Clinician)');
  console.log('    receptionist / recept123     (Receptionist)');
});
