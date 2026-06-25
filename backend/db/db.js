import { randomUUID as uuidv4 } from 'crypto';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;


const userIds = {
  admin:        uuidv4(),
  clinician:    uuidv4(),
  receptionist: uuidv4(),
};

const db = {


  users: [
    { id: userIds.admin,        username: 'admin',        password: bcrypt.hashSync('admin123',  SALT_ROUNDS), role: 'administrator', doctorId: null },
    { id: userIds.clinician,    username: 'clinician',    password: bcrypt.hashSync('clinic123', SALT_ROUNDS), role: 'clinician',     doctorId: null },
    { id: userIds.receptionist, username: 'receptionist', password: bcrypt.hashSync('recept123', SALT_ROUNDS), role: 'receptionist',  doctorId: null },
  ],


  doctors: [
  ],


  patients: [
    
  ],

  diseases: [
    
  ],

  diseasesCatalog: [
    
  ],

  diseaseRequests: [],

  activityLog: [
    
  ],
};

export default db;
