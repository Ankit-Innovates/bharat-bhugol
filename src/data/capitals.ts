// The capital of every state and union territory, by its name in india-map.json. Typed answers
// match whole names, ignoring case, spaces and punctuation; `alt` lists other answers that count:
// old names, and the second capital of states that have one. Checked October 2026.

export interface Capital {
  capital: string
  alt?: string[]
}

export const CAPITALS: Readonly<Record<string, Capital>> = {
  // States
  'Andhra Pradesh': { capital: 'Amaravati', alt: ['amravati'] },
  'Arunachal Pradesh': { capital: 'Itanagar' },
  // Dispur is part of Guwahati.
  Assam: { capital: 'Dispur', alt: ['guwahati'] },
  Bihar: { capital: 'Patna' },
  Chhattisgarh: { capital: 'Raipur', alt: ['nava raipur', 'naya raipur', 'atal nagar'] },
  Goa: { capital: 'Panaji', alt: ['panjim'] },
  Gujarat: { capital: 'Gandhinagar' },
  Haryana: { capital: 'Chandigarh' },
  // Shimla, and Dharamshala in winter
  'Himachal Pradesh': { capital: 'Shimla', alt: ['simla', 'dharamshala', 'dharamsala'] },
  Jharkhand: { capital: 'Ranchi' },
  Karnataka: { capital: 'Bengaluru', alt: ['bangalore'] },
  Kerala: { capital: 'Thiruvananthapuram', alt: ['trivandrum'] },
  'Madhya Pradesh': { capital: 'Bhopal' },
  Maharashtra: { capital: 'Mumbai', alt: ['bombay'] },
  Manipur: { capital: 'Imphal' },
  Meghalaya: { capital: 'Shillong' },
  Mizoram: { capital: 'Aizawl' },
  Nagaland: { capital: 'Kohima' },
  Odisha: { capital: 'Bhubaneswar', alt: ['bhubaneshwar'] },
  Punjab: { capital: 'Chandigarh' },
  Rajasthan: { capital: 'Jaipur' },
  Sikkim: { capital: 'Gangtok' },
  'Tamil Nadu': { capital: 'Chennai', alt: ['madras'] },
  Telangana: { capital: 'Hyderabad' },
  Tripura: { capital: 'Agartala' },
  'Uttar Pradesh': { capital: 'Lucknow' },
  // Dehradun, and Gairsain (Bhararisain) in summer
  Uttarakhand: { capital: 'Dehradun', alt: ['dehra dun', 'gairsain', 'bhararisain'] },
  'West Bengal': { capital: 'Kolkata', alt: ['calcutta'] },

  // Union territories
  // Port Blair was renamed Sri Vijaya Puram in 2024.
  'Andaman and Nicobar Islands': { capital: 'Sri Vijaya Puram', alt: ['port blair'] },
  Chandigarh: { capital: 'Chandigarh' },
  'Dadra and Nagar Haveli and Daman and Diu': { capital: 'Daman' },
  Delhi: { capital: 'New Delhi', alt: ['delhi'] },
  // Srinagar, and Jammu in winter
  'Jammu and Kashmir': { capital: 'Srinagar', alt: ['jammu'] },
  Ladakh: { capital: 'Leh', alt: ['kargil'] },
  Lakshadweep: { capital: 'Kavaratti' },
  Puducherry: { capital: 'Puducherry', alt: ['pondicherry'] },
}
