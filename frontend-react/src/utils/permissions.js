export const ROLES = {
  ADMIN:        'Admin',
  CLINICIAN:    'Clinician',
  RECEPTIONIST: 'Receptionist',
  DOCTOR:       'Doctor',
};

export const ROLE_MAP = {
  administrator: 'Admin',
  clinician:     'Clinician',
  receptionist:  'Receptionist',
  doctor:        'Doctor',
};

export const Permissions = {
  doctors: {
    Admin:        { create: true,  edit: true,  delete: true,  view: true },
    Clinician:    { create: false, edit: false, delete: false, view: true },
    Receptionist: { create: false, edit: false, delete: false, view: true },
    Doctor:       { create: false, edit: false, delete: false, view: true },
  },
  patients: {
    Admin:        { create: true,  edit: true,  delete: true,  view: true },
    Clinician:    { create: false, edit: true,  delete: false, view: true },
    Receptionist: { create: true,  edit: false, delete: false, view: true },
    Doctor:       { create: false, edit: true,  delete: false, view: true },
  },
  diagnoses: {
    Admin:        { create: true,  edit: true,  delete: true,  view: true  },
    Clinician:    { create: false, edit: false, delete: false, view: true  },
    Receptionist: { create: false, edit: false, delete: false, view: false },
    Doctor:       { create: false, edit: false, delete: false, view: true  },
  },
  diseases: {
    Admin:        { create: true,  edit: true,  delete: true,  view: true  },
    Clinician:    { create: false, edit: false, delete: false, view: true  },
    Receptionist: { create: false, edit: false, delete: false, view: false },
    Doctor:       { create: false, edit: false, delete: false, view: true  },
  },
};

export function can(module, action, role) {
  return !!(Permissions[module]?.[role]?.[action]);
}
