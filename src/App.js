import React, { useState, useEffect } from 'react';
import { Activity, User, Users, TrendingUp, Clock, BarChart3, AlertCircle, Download, History, FileSpreadsheet, XCircle, ArrowLeft } from 'lucide-react';
import * as XLSX from 'xlsx';

// Firebase Configuration
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDo--_nMOGCwgN3M6dZUCL3S9P8mgK9Em4",
  projectId: "breathdx-system"
};

// Utility Functions for Firebase REST API
const firestoreAPI = {
  getFirestoreUrl() {
    return `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents`;
  },

  async getDoc(path) {
    const url = `${this.getFirestoreUrl()}/${path}?key=${FIREBASE_CONFIG.apiKey}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return this.parseDocument(data);
  },

  async getCollection(path) {
    const url = `${this.getFirestoreUrl()}/${path}?key=${FIREBASE_CONFIG.apiKey}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return data.documents ? data.documents.map(doc => this.parseDocument(doc)) : [];
  },

  async setDoc(path, data) {
    const url = `${this.getFirestoreUrl()}/${path}?key=${FIREBASE_CONFIG.apiKey}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: this.toFirestoreFields(data) })
    });
    return response.ok;
  },

  async updateDoc(path, data) {
    const url = `${this.getFirestoreUrl()}/${path}?key=${FIREBASE_CONFIG.apiKey}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: this.toFirestoreFields(data) })
    });
    return response.ok;
  },

  async deleteDoc(path) {
    const url = `${this.getFirestoreUrl()}/${path}?key=${FIREBASE_CONFIG.apiKey}`;
    const response = await fetch(url, { method: 'DELETE' });
    return response.ok;
  },

  async createSessionResultRequest(sessionId) {
    const url = `${this.getFirestoreUrl()}/session_result_request/display?key=${FIREBASE_CONFIG.apiKey}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        fields: {
          session_id: { stringValue: sessionId },
          display: { booleanValue: true },
          timestamp: { timestampValue: new Date().toISOString() }
        }
      })
    });
    return response.ok;
  },

  async clearSessionResultRequest() {
    const url = `${this.getFirestoreUrl()}/session_result_request/display?key=${FIREBASE_CONFIG.apiKey}`;
    const response = await fetch(url, { method: 'DELETE' });
    return response.ok;
  },

  

  // Update the parseDocument function in firestoreAPI
parseDocument(doc) {
  if (!doc || !doc.fields) return null;
  const data = { _id: doc.name.split('/').pop() };
  Object.keys(doc.fields).forEach(key => {
    const field = doc.fields[key];
    if (field.stringValue !== undefined) data[key] = field.stringValue;
    else if (field.integerValue !== undefined) data[key] = parseInt(field.integerValue);
    else if (field.doubleValue !== undefined) data[key] = parseFloat(field.doubleValue);
    else if (field.booleanValue !== undefined) data[key] = field.booleanValue;
    else if (field.timestampValue !== undefined) {
      // Handle Firestore timestamp
      data[key] = field.timestampValue;
    }
    else if (field.mapValue) data[key] = this.parseMap(field.mapValue.fields);
  });
  return data;
},

  parseMap(fields) {
    const obj = {};
    Object.keys(fields).forEach(key => {
      const field = fields[key];
      if (field.stringValue !== undefined) obj[key] = field.stringValue;
      else if (field.integerValue !== undefined) obj[key] = parseInt(field.integerValue);
      else if (field.doubleValue !== undefined) obj[key] = parseFloat(field.doubleValue);
      else if (field.booleanValue !== undefined) obj[key] = field.booleanValue;
      else if (field.mapValue) obj[key] = this.parseMap(field.mapValue.fields);
    });
    return obj;
  },

  toFirestoreFields(obj) {
    const fields = {};
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (typeof value === 'string') fields[key] = { stringValue: value };
      else if (typeof value === 'number' && Number.isInteger(value)) fields[key] = { integerValue: value };
      else if (typeof value === 'number') fields[key] = { doubleValue: value };
      else if (typeof value === 'boolean') fields[key] = { booleanValue: value };
      else if (typeof value === 'object' && value !== null) {
        fields[key] = { mapValue: { fields: this.toFirestoreFields(value) } };
      }
    });
    return fields;
  }
};

// Main App Component
function App() {
  const [currentPage, setCurrentPage] = useState('login');
  const [patientData, setPatientData] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [previousPage, setPreviousPage] = useState(null);

  const navigateTo = (page, data = null) => {
    setPreviousPage(currentPage);
    setCurrentPage(page);
    if (data) {
      if (data.patient) setPatientData(data.patient);
      if (data.session) setSessionData(data.session);
      if (data.currentSessionId) setCurrentSessionId(data.currentSessionId);
    }
  };

  const goBack = () => {
    if (previousPage) {
      setCurrentPage(previousPage);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {currentPage === 'login' && <LoginPage navigateTo={navigateTo} />}
      {currentPage === 'createPatient' && <CreatePatientPage navigateTo={navigateTo} />}
      {currentPage === 'patientCreated' && <PatientCreatedPage navigateTo={navigateTo} patientData={patientData} />}
      {currentPage === 'dashboard' && <DashboardPage navigateTo={navigateTo} patientData={patientData} />}
      {currentPage === 'sessionDetails' && <SessionDetailsPage navigateTo={navigateTo} patientData={patientData} />}
      {currentPage === 'diagnosis' && <DiagnosisPage navigateTo={navigateTo} patientData={patientData} sessionData={sessionData} currentSessionId={currentSessionId} />}
      {currentPage === 'results' && <ResultsPage navigateTo={navigateTo} patientData={patientData} sessionData={sessionData} currentSessionId={currentSessionId} />}
      {currentPage === 'sessionSummary' && <SessionSummaryPage navigateTo={navigateTo} goBack={goBack} patientData={patientData} currentSessionId={currentSessionId} />}
      {currentPage === 'compare' && <ComparePage navigateTo={navigateTo} patientData={patientData} />}
    </div>
  );
}

// Login Page
function LoginPage({ navigateTo }) {
  const [patientId, setPatientId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEnterPatientId = async () => {
    if (!patientId.trim()) {
      setError('Please enter a Patient ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const patientDoc = await firestoreAPI.getDoc(`patients/${patientId}`);

      if (patientDoc && patientDoc.basic_info) {
        const basicInfo = patientDoc.basic_info;
        const sessions = await firestoreAPI.getCollection(`patients/${patientId}/sessions`);

        navigateTo('dashboard', {
          patient: {
            id: patientId,
            ...basicInfo,
            sessionCount: sessions.length
          }
        });
      } else {
        setError('Patient ID not found. Please check and try again.');
      }
    } catch (err) {
      setError('Error fetching patient data. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
            <Activity className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">BreathDx</h1>
          <p className="text-gray-600">Advanced Diabetes Detection System</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter Patient ID
            </label>
            <input
              type="text"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="e.g., P-1"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              onKeyPress={(e) => e.key === 'Enter' && handleEnterPatientId()}
            />
            {error && (
              <div className="mt-2 flex items-center text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 mr-1" />
                {error}
              </div>
            )}
          </div>

          <button
            onClick={handleEnterPatientId}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition transform hover:scale-105 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Access Dashboard'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          <button
            onClick={() => navigateTo('createPatient')}
            className="w-full bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:border-blue-500 hover:text-blue-600 transition transform hover:scale-105"
          >
            Create New Patient ID
          </button>
        </div>
      </div>
    </div>
  );
}

// Create Patient Page
function CreatePatientPage({ navigateTo }) {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    sex: '',
    mobile: '',
    married: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.age || !formData.sex || !formData.mobile || !formData.married) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const patients = await firestoreAPI.getCollection('patients');
      
      let existingPatientId = null;
      let maxNumber = 0;

      for (const patient of patients) {
        const patientId = patient._id;
        const patientNumber = parseInt(patientId.split('-')[1]);
        if (patientNumber > maxNumber) maxNumber = patientNumber;

        if (patient.basic_info) {
          const info = patient.basic_info;
          if (info.name === formData.name && 
              info.age === parseInt(formData.age) && 
              info.sex === formData.sex && 
              info.mobile === formData.mobile &&
              info.married === formData.married) {
            existingPatientId = patientId;
          }
        }
      }

      if (existingPatientId) {
        navigateTo('patientCreated', {
          patient: {
            id: existingPatientId,
            ...formData,
            age: parseInt(formData.age),
            isExisting: true
          }
        });
        return;
      }

      const newPatientId = `P-${maxNumber + 1}`;

      await firestoreAPI.setDoc(`patients/${newPatientId}`, {
        basic_info: {
          name: formData.name,
          age: parseInt(formData.age),
          sex: formData.sex,
          mobile: formData.mobile,
          married: formData.married,
          created_at: new Date().toISOString()
        }
      });

      navigateTo('patientCreated', {
        patient: {
          id: newPatientId,
          ...formData,
          age: parseInt(formData.age),
          isExisting: false
        }
      });
    } catch (err) {
      setError('Error creating patient. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <button
          onClick={() => navigateTo('login')}
          className="mb-6 text-blue-600 hover:text-blue-700 flex items-center"
        >
          ← Back to Login
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center mb-6">
            <div className="p-3 bg-blue-100 rounded-lg mr-4">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Create Patient Profile</h2>
              <p className="text-gray-600">Enter patient information to get started</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({...formData, age: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Age"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sex</label>
                <select
                  value={formData.sex}
                  onChange={(e) => setFormData({...formData, sex: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
                <input
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Marital Status</label>
                <select
                  value={formData.married}
                  onChange={(e) => setFormData({...formData, married: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="flex items-center text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 mr-1" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Patient Profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Patient Created Page
function PatientCreatedPage({ navigateTo, patientData }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="inline-block p-4 bg-green-100 rounded-full mb-4">
            <User className="w-12 h-12 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {patientData?.isExisting ? 'Patient Found!' : 'Patient Created Successfully!'}
          </h2>
          
          <p className="text-gray-600 mb-6">
            {patientData?.isExisting 
              ? 'This patient already exists in our system.'
              : 'New patient profile has been created.'}
          </p>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
            <p className="text-sm text-gray-600 mb-2">Patient ID</p>
            <p className="text-3xl font-bold text-blue-600">{patientData?.id}</p>
          </div>

          <div className="space-y-3 text-left mb-6">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Name:</span>
              <span className="font-semibold">{patientData?.name}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Age:</span>
              <span className="font-semibold">{patientData?.age}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Sex:</span>
              <span className="font-semibold">{patientData?.sex}</span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => navigateTo('login')}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition"
            >
              Return to Login
            </button>
            
            <button
              onClick={() => navigateTo('createPatient')}
              className="w-full bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:border-blue-500 hover:text-blue-600 transition"
            >
              Create Another Patient
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Dashboard Page
function DashboardPage({ navigateTo, patientData }) {
  const [previousSessions, setPreviousSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPreviousSessions();
  }, []);

  const loadPreviousSessions = async () => {
    try {
      const sessions = await firestoreAPI.getCollection(`patients/${patientData.id}/sessions`);
      const sessionsWithSubsessions = await Promise.all(
        sessions.map(async (session) => {
          const subsessions = await firestoreAPI.getCollection(
            `patients/${patientData.id}/sessions/${session._id}/subsessions`
          );
          return {
            ...session,
            subsessionCount: subsessions.length
          };
        })
      );
      setPreviousSessions(sessionsWithSubsessions);
    } catch (err) {
      console.error('Error loading sessions:', err);
    }
  };

  const handleSessionSelect = async (sessionId) => {
  if (sessionId === selectedSession) {
    setSelectedSession(null);
    setSessionDetails(null);
    return;
  }

  setLoading(true);
  setSelectedSession(sessionId);

  try {
    const subsessions = await firestoreAPI.getCollection(
      `patients/${patientData.id}/sessions/${sessionId}/subsessions`
    );

    const subsessionsWithData = await Promise.all(
      subsessions.map(async (subsession) => {
        const sensorData = await firestoreAPI.getCollection(
          `patients/${patientData.id}/sessions/${sessionId}/subsessions/${subsession._id}/sensor_data`
        );
        
        // Get result from the subsession document itself (not from subsession_result)
        const result = {
          avgTemp: subsession.avgTemp,
          avgHumidity: subsession.avgHumidity,
          avgLowestSGP40: subsession.avgLowestSGP40,
          avgHighestMQ2: subsession.avgHighestMQ2
        };
        
        return {
          ...subsession,
          result: result,
          sensorData
        };
      })
    );

    setSessionDetails(subsessionsWithData);
  } catch (err) {
    console.error('Error loading session details:', err);
  } finally {
    setLoading(false);
  }
};



  // Update downloadSessionExcel function in DashboardPage
// Update downloadSessionExcel function in DashboardPage
const downloadSessionExcel = async (sessionId, subsessionId) => {
  const subsession = sessionDetails.find(s => s._id === subsessionId);
  if (!subsession || !subsession.sensorData) return;

  // Get session details
  const sessionDoc = await firestoreAPI.getDoc(`patients/${patientData.id}/sessions/${sessionId}`);

  const wb = XLSX.utils.book_new();

  // Sheet 1: Session Information
  const sessionInfo = [
    ['Patient Name', sessionDoc?.patientName || patientData.name],
    ['Patient ID', sessionDoc?.patientId || patientData.id],
    ['Session ID', sessionId],
    ['Subsession ID', subsessionId],
    [''],
    ['Session Details'],
    ['Meal Time', sessionDoc?.mealTime || 'N/A'],
    ['Alcohol Consumption', sessionDoc?.alcoholConsumption || 'N/A'],
    ['Blood Glucose Level (mg/dL)', sessionDoc?.bloodGlucose || 'N/A'],
    ['Session Duration (Time of Day)', sessionDoc?.sessionDuration || 'N/A'],
    ['Session Timestamp', sessionDoc?.timestamp ? new Date(sessionDoc.timestamp).toLocaleString() : 'N/A']
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(sessionInfo);
  XLSX.utils.book_append_sheet(wb, ws1, 'Session Info');

  // Sheet 2: Sensor Data
  const ws2 = XLSX.utils.json_to_sheet(
    subsession.sensorData.map(data => {
      let timestamp = 'N/A';
      if (data.timestamp) {
        if (data.timestamp._seconds) {
          timestamp = new Date(data.timestamp._seconds * 1000).toLocaleString();
        } else if (typeof data.timestamp === 'string') {
          timestamp = new Date(data.timestamp).toLocaleString();
        } else if (typeof data.timestamp === 'number') {
          timestamp = new Date(data.timestamp).toLocaleString();
        }
      }
      
      return {
        Temperature: data.temperature,
        Humidity: data.humidity,
        SGP40: data.sgp40_raw,
        MQ2: data.mq2_adc,
        Timestamp: timestamp
      };
    })
  );
  XLSX.utils.book_append_sheet(wb, ws2, 'Sensor Data');

  XLSX.writeFile(wb, `${patientData.id}_${sessionId}_${subsessionId}.xlsx`);
};



// Update downloadSessionCSV function in DashboardPage
const downloadSessionCSV = async (sessionId, subsessionId) => {
  const subsession = sessionDetails.find(s => s._id === subsessionId);
  if (!subsession || !subsession.sensorData) return;

  // Get session details
  const sessionDoc = await firestoreAPI.getDoc(`patients/${patientData.id}/sessions/${sessionId}`);

  let csvContent = "=== SESSION INFORMATION ===\n";
  csvContent += "Patient Name," + (sessionDoc?.patientName || patientData.name) + "\n";
  csvContent += "Patient ID," + (sessionDoc?.patientId || patientData.id) + "\n";
  csvContent += "Session ID," + sessionId + "\n";
  csvContent += "Subsession ID," + subsessionId + "\n";
  csvContent += "\n";
  csvContent += "=== SESSION DETAILS ===\n";
  csvContent += "Meal Time," + (sessionDoc?.mealTime || 'N/A') + "\n";
  csvContent += "Alcohol Consumption," + (sessionDoc?.alcoholConsumption || 'N/A') + "\n";
  csvContent += "Blood Glucose Level (mg/dL)," + (sessionDoc?.bloodGlucose || 'N/A') + "\n";
  csvContent += "Session Duration (Time of Day)," + (sessionDoc?.sessionDuration || 'N/A') + "\n";
  csvContent += "Session Timestamp," + (sessionDoc?.timestamp ? new Date(sessionDoc.timestamp).toLocaleString() : 'N/A') + "\n";
  csvContent += "\n";
  csvContent += "=== SENSOR DATA ===\n";
  csvContent += "Temperature,Humidity,SGP40,MQ2,Timestamp\n";
  
  subsession.sensorData.forEach(data => {
    let timestamp = 'N/A';
    if (data.timestamp) {
      if (data.timestamp._seconds) {
        timestamp = new Date(data.timestamp._seconds * 1000).toLocaleString();
      } else if (typeof data.timestamp === 'string') {
        timestamp = new Date(data.timestamp).toLocaleString();
      } else if (typeof data.timestamp === 'number') {
        timestamp = new Date(data.timestamp).toLocaleString();
      }
    }
    csvContent += `${data.temperature},${data.humidity},${data.sgp40_raw},${data.mq2_adc},"${timestamp}"\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${patientData.id}_${sessionId}_${subsessionId}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Patient Dashboard</h1>
            <p className="text-gray-600">Monitor and manage patient diagnostics</p>
          </div>
          <button
            onClick={() => navigateTo('login')}
            className="px-4 py-2 text-blue-600 hover:text-blue-700"
          >
            ← Back to Login
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <User className="w-8 h-8 text-blue-500" />
              <span className="text-2xl font-bold text-gray-800">{patientData?.id}</span>
            </div>
            <p className="text-sm text-gray-600">Patient ID</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-8 h-8 text-purple-500" />
              <span className="text-2xl font-bold text-gray-800">{previousSessions.length}</span>
            </div>
            <p className="text-sm text-gray-600">Total Sessions</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Patient Information</h2>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-600 w-32">Name:</span>
                <span className="font-semibold text-gray-800">{patientData?.name}</span>
              </div>
              <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-600 w-32">Age:</span>
                <span className="font-semibold text-gray-800">{patientData?.age} years</span>
              </div>
              <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-600 w-32">Sex:</span>
                <span className="font-semibold text-gray-800">{patientData?.sex}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-600 w-32">Mobile:</span>
                <span className="font-semibold text-gray-800">{patientData?.mobile}</span>
              </div>
              <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-600 w-32">Marital Status:</span>
                <span className="font-semibold text-gray-800">{patientData?.married}</span>
              </div>
              <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-600 w-32">Total Sessions:</span>
                <span className="font-semibold text-gray-800">#{previousSessions.length}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigateTo('sessionDetails', { patient: patientData })}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-lg font-semibold text-lg hover:from-blue-600 hover:to-purple-700 transition transform hover:scale-105"
          >
            Start New Session
          </button>
          
          <button
            onClick={() => navigateTo('compare', { patient: patientData })}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-4 rounded-lg font-semibold text-lg hover:from-purple-600 hover:to-pink-700 transition transform hover:scale-105 mt-4"
          >
            Compare Sessions
          </button>
        </div>

        {previousSessions.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center mb-6">
              <History className="w-6 h-6 text-blue-600 mr-2" />
              <h2 className="text-2xl font-bold text-gray-800">Previous Diagnosis</h2>
            </div>

            <div className="space-y-4">
              {previousSessions.map((session) => (
                <div key={session._id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => handleSessionSelect(session._id)}
                    className="w-full p-4 bg-gray-50 hover:bg-gray-100 transition flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <FileSpreadsheet className="w-5 h-5 text-blue-600 mr-3" />
                      <div className="text-left">
                        <p className="font-semibold text-gray-800">{session._id}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(session.timestamp).toLocaleString()} • {session.subsessionCount} subsession(s)
                        </p>
                      </div>
                    </div>
                    <div className="text-blue-600">
                      {selectedSession === session._id ? '▼' : '▶'}
                    </div>
                  </button>

                  {selectedSession === session._id && (
                    <div className="p-4 bg-white border-t">
                      {loading ? (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        </div>
                      ) : sessionDetails ? (
                        <div className="space-y-4">
                          {sessionDetails.map((subsession) => {
                            const result = subsession.result;
                            
                            return (
                              <div key={subsession._id} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="font-semibold text-gray-800">{subsession._id}</h4>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => downloadSessionCSV(session._id, subsession._id)}
                                      className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm"
                                    >
                                      <Download className="w-4 h-4" />
                                      Download CSV
                                    </button>
                                    <button
                                      onClick={() => downloadSessionExcel(session._id, subsession._id)}
                                      className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm"
                                    >
                                      <Download className="w-4 h-4" />
                                      Download Excel
                                    </button>
                                  </div>
                                </div>
                                
                                {/* {result && (
                                  <>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                      <div className="bg-blue-50 p-3 rounded-lg">
                                        <p className="text-xs text-blue-600 mb-1">Body Temperature</p>
                                        <p className="text-lg font-bold text-blue-700">{result.avgTemp}°C</p>
                                      </div>
                                      <div className="bg-green-50 p-3 rounded-lg">
                                        <p className="text-xs text-green-600 mb-1">Humidity in Body</p>
                                        <p className="text-lg font-bold text-green-700">{result.avgHumidity}%</p>
                                      </div>
                                      <div className="bg-purple-50 p-3 rounded-lg">
                                        <p className="text-xs text-purple-600 mb-1">SENSOR_1</p>
                                        <p className="text-lg font-bold text-purple-700">{result.avgLowestSGP40}</p>
                                      </div>
                                      <div className="bg-orange-50 p-3 rounded-lg">
                                        <p className="text-xs text-orange-600 mb-1">SENSOR_2</p>
                                        <p className="text-lg font-bold text-orange-700">{result.avgHighestMQ2}</p>
                                      </div>
                                    </div>
                                    <p className="text-sm text-gray-600">Total Readings: {subsession.sensorData.length}</p>
                                  </>
                                )} */}

                                {result ? (
                                  <>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                      <div className="bg-blue-50 p-3 rounded-lg">
                                        <p className="text-xs text-blue-600 mb-1">Body Temperature</p>
                                        <p className="text-lg font-bold text-blue-700">
                                          {typeof result.avgTemp === "number"
                                            ? `${result.avgTemp.toFixed(2)} °C`
                                            : "—"}
                                        </p>
                                      </div>

                                      <div className="bg-green-50 p-3 rounded-lg">
                                        <p className="text-xs text-green-600 mb-1">Body Humidity</p>
                                        <p className="text-lg font-bold text-green-700">
                                          {typeof result.avgHumidity === "number"
                                            ? `${result.avgHumidity.toFixed(2)} %`
                                            : "—"}
                                        </p>
                                      </div>

                                      <div className="bg-purple-50 p-3 rounded-lg">
                                        <p className="text-xs text-purple-600 mb-1">SENSOR 1</p>
                                        <p className="text-lg font-bold text-purple-700">
                                          {typeof result.avgLowestSGP40 === "number"
                                            ? result.avgLowestSGP40.toFixed(1)
                                            : "—"}
                                        </p>
                                      </div>

                                      <div className="bg-orange-50 p-3 rounded-lg">
                                        <p className="text-xs text-orange-600 mb-1">SENSOR 2</p>
                                        <p className="text-lg font-bold text-orange-700">
                                          {typeof result.avgHighestMQ2 === "number"
                                            ? result.avgHighestMQ2.toFixed(1)
                                            : "—"}
                                        </p>
                                      </div>
                                    </div>

                                    <p className="text-sm text-gray-600">
                                      Total Readings: {subsession.sensorData?.length ?? 0}
                                    </p>
                                  </>
                                ) : (
                                  <p className="text-sm text-gray-500 italic">
                                    No results available for this subsession
                                  </p>
                                )}

                                
                                {/* {!result && (
                                  <p className="text-sm text-gray-500 italic">No results available for this subsession</p>
                                )} */}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-gray-600 text-center py-4">No data available</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
              </div>
    </div>
  );
}


// Session Details Page
function SessionDetailsPage({ navigateTo, patientData }) {
  const [formData, setFormData] = useState({
    mealTime: '',
    alcoholConsumption: '',
    bloodGlucose: '',
    sessionDuration: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // const handleSubmit = async (e) => {
  //   e.preventDefault();
    
  //   if (!formData.mealTime || !formData.alcoholConsumption || !formData.bloodGlucose || !formData.sessionDuration) {
  //     setError('Please fill in all fields');
  //     return;
  //   }

  //   setLoading(true);
  //   setError('');

  //   try {
  //     const sessions = await firestoreAPI.getCollection(`patients/${patientData.id}/sessions`);
  //     const newSessionNumber = sessions.length + 1;
  //     const sessionId = `sessionID_${String(newSessionNumber).padStart(3, '0')}`;
      
  //     // Create session with details
  //     await firestoreAPI.setDoc(`patients/${patientData.id}/sessions/${sessionId}`, {
  //       session_ID: sessionId,
  //       timestamp: new Date().toISOString(),
  //       status: 'active',
  //       notes: '',
  //       patientName: patientData.name,
  //       patientId: patientData.id,
  //       mealTime: formData.mealTime,
  //       alcoholConsumption: formData.alcoholConsumption,
  //       bloodGlucose: parseFloat(formData.bloodGlucose),
  //       sessionDuration: formData.sessionDuration
  //     });

  //     // Create first subsession
  //     const subsessionId = `subsession_001`;
  //     await firestoreAPI.setDoc(
  //       `patients/${patientData.id}/sessions/${sessionId}/subsessions/${subsessionId}`,
  //       {
  //         subsession_ID: subsessionId,
  //         timestamp: new Date().toISOString(),
  //         status: 'in_progress'
  //       }
  //     );

  //     navigateTo('diagnosis', {
  //       patient: patientData,
  //       session: { id: subsessionId, number: 1 },
  //       currentSessionId: sessionId
  //     });
  //   } catch (err) {
  //     setError('Error creating session. Please try again.');
  //     console.error(err);
  //   } finally {
  //     setLoading(false);
  //   }
  // };


  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.mealTime || !formData.alcoholConsumption || !formData.bloodGlucose || !formData.sessionDuration) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const sessions = await firestoreAPI.getCollection(`patients/${patientData.id}/sessions`);
      const newSessionNumber = sessions.length + 1;
      const sessionId = `sessionID_${String(newSessionNumber).padStart(3, '0')}`;
      
      // Create session with details - NO status or timestamp here
      await firestoreAPI.setDoc(`patients/${patientData.id}/sessions/${sessionId}`, {
        session_ID: sessionId,
        patientName: patientData.name,
        patientId: patientData.id,
        mealTime: formData.mealTime,
        alcoholConsumption: formData.alcoholConsumption,
        bloodGlucose: parseFloat(formData.bloodGlucose),
        sessionDuration: formData.sessionDuration,
        createdAt: new Date().toISOString() // Use createdAt instead of timestamp
      });

      // Create first subsession
      const subsessionId = `subsession_001`;
      await firestoreAPI.setDoc(
        `patients/${patientData.id}/sessions/${sessionId}/subsessions/${subsessionId}`,
        {
          subsession_ID: subsessionId,
          timestamp: new Date().toISOString(),
          status: 'in_progress'
        }
      );

      navigateTo('diagnosis', {
        patient: patientData,
        session: { id: subsessionId, number: 1 },
        currentSessionId: sessionId
      });
    } catch (err) {
      setError('Error creating session. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <button
          onClick={() => navigateTo('dashboard', { patient: patientData })}
          className="mb-6 text-blue-600 hover:text-blue-700 flex items-center"
        >
          ← Back to Dashboard
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center mb-6">
            <div className="p-3 bg-blue-100 rounded-lg mr-4">
              <FileSpreadsheet className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Session Details</h2>
              <p className="text-gray-600">Enter information before starting the session</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Khana Kitni Der Pehle Khaya (When did you eat?)
              </label>
              <select
                value={formData.mealTime}
                onChange={(e) => setFormData({...formData, mealTime: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select time...</option>
                <option value="Just now">Just now (0-30 minutes)</option>
                <option value="30 minutes - 1 hour">30 minutes - 1 hour ago</option>
                <option value="1-2 hours">1-2 hours ago</option>
                <option value="2-4 hours">2-4 hours ago</option>
                <option value="4-6 hours">4-6 hours ago</option>
                <option value="6+ hours">6+ hours ago</option>
                <option value="Fasting">Fasting (not eaten)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alcohol Consumption
              </label>
              <div className="flex gap-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="alcohol"
                    value="Yes"
                    checked={formData.alcoholConsumption === 'Yes'}
                    onChange={(e) => setFormData({...formData, alcoholConsumption: e.target.value})}
                    className="mr-2 w-4 h-4 text-blue-600"
                  />
                  <span className="text-gray-700">Yes</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="alcohol"
                    value="No"
                    checked={formData.alcoholConsumption === 'No'}
                    onChange={(e) => setFormData({...formData, alcoholConsumption: e.target.value})}
                    className="mr-2 w-4 h-4 text-blue-600"
                  />
                  <span className="text-gray-700">No</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Blood Glucose Level (mg/dL)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.bloodGlucose}
                onChange={(e) => setFormData({...formData, bloodGlucose: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter blood glucose level"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Duration (Time of Day)
              </label>
              <select
                value={formData.sessionDuration}
                onChange={(e) => setFormData({...formData, sessionDuration: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select time of day...</option>
                <option value="Morning">Morning (6 AM - 12 PM)</option>
                <option value="Afternoon">Afternoon (12 PM - 5 PM)</option>
                <option value="Evening">Evening (5 PM - 8 PM)</option>
                <option value="Night">Night (8 PM - 6 AM)</option>
              </select>
            </div>

            {error && (
              <div className="flex items-center text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 mr-1" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition disabled:opacity-50"
            >
              {loading ? 'Creating Session...' : 'Start Session'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
// Diagnosis Page
function DiagnosisPage({ navigateTo, patientData, sessionData, currentSessionId }) {
  const [phase, setPhase] = useState('calibrating');
  const [countdown, setCountdown] = useState(6);
  const [stopping, setStopping] = useState(false);

  const handleStop = async () => {
    if (stopping) return;
    
    setStopping(true);
    
    try {
      await firestoreAPI.deleteDoc('active_monitoring/current');
      
      const subsessions = await firestoreAPI.getCollection(
        `patients/${patientData.id}/sessions/${currentSessionId}/subsessions`
      );
      
      if (subsessions.length === 1 && subsessions[0]._id === sessionData.id) {
        await firestoreAPI.deleteDoc(`patients/${patientData.id}/sessions/${currentSessionId}`);
      } else {
        await firestoreAPI.deleteDoc(
          `patients/${patientData.id}/sessions/${currentSessionId}/subsessions/${sessionData.id}`
        );
      }
      
      navigateTo('login');
    } catch (err) {
      console.error('Error stopping diagnosis:', err);
      navigateTo('login');
    }
  };

  useEffect(() => {
    const runDiagnosis = async () => {
      setPhase('calibrating');
      setCountdown(6);
      
      for (let i = 6; i > 0; i--) {
        if (stopping) return;
        setCountdown(i);
          await firestoreAPI.setDoc('active_monitoring/current', {
          patient_id: patientData.id,
          session_id: currentSessionId,
          subsession_id: sessionData.id,
          monitoring: true,
          timestamp: new Date().toISOString()
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // await firestoreAPI.setDoc('active_monitoring/current', {
      //   patient_id: patientData.id,
      //   session_id: currentSessionId,
      //   subsession_id: sessionData.id,
      //   monitoring: true,
      //   timestamp: new Date().toISOString()
      // });

      setPhase('blowing');
      setCountdown(10);

      for (let i = 10; i > 0; i--) {
        if (stopping) return;
        setCountdown(i);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setPhase('analyzing');
      setCountdown(35);

      for (let i = 35; i > 0; i--) {
        if (stopping) return;
        setCountdown(i);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await firestoreAPI.setDoc('active_monitoring/current', {
        patient_id: patientData.id,
        session_id: currentSessionId,
        subsession_id: sessionData.id,
        monitoring: false,
        timestamp: new Date().toISOString()
      });
      
      setPhase('processing');
      setCountdown(5);

      for (let i = 5; i > 0; i--) {
        if (stopping) return;
        setCountdown(i);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await firestoreAPI.deleteDoc('active_monitoring/current');
      setPhase('complete');
      
      const sensorData = await firestoreAPI.getCollection(
        `patients/${patientData.id}/sessions/${currentSessionId}/subsessions/${sessionData.id}/sensor_data`
      );

      navigateTo('results', {
        patient: patientData,
        session: { ...sessionData, readings: sensorData },
        currentSessionId: currentSessionId
      });
    };

    runDiagnosis();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center relative">
          <button
            onClick={handleStop}
            disabled={stopping}
            className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" />
            {stopping ? 'Stopping...' : 'Stop Diagnosis'}
          </button>

          {phase === 'calibrating' && (
            <>
              <div className="inline-block p-6 bg-blue-100 rounded-full mb-6 animate-pulse">
                <TrendingUp className="w-16 h-16 text-blue-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Calibrating Sensors</h2>
              <p className="text-gray-600 mb-8">Please wait while we prepare the system...</p>
              <div className="text-6xl font-bold text-blue-600 mb-4">{countdown}</div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-1000"
                  style={{ width: `${((6 - countdown) / 6) * 100}%` }}
                />
              </div>
            </>
          )}

          {phase === 'blowing' && (
            <>
              <div className="inline-block p-6 bg-green-100 rounded-full mb-6 animate-bounce">
                <Activity className="w-16 h-16 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Blow Into Sensor</h2>
              <p className="text-gray-600 mb-8">Exhale steadily into the breath sensor for 10 seconds...</p>
              <div className="text-6xl font-bold text-green-600 mb-4">{countdown}</div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-green-600 h-3 rounded-full transition-all duration-1000"
                  style={{ width: `${((10 - countdown) / 10) * 100}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-4">Keep blowing steadily... MICRO CONTROLLER is recording</p>
            </>
          )}

          {phase === 'analyzing' && (
            <>
              <div className="inline-block p-6 bg-blue-100 rounded-full mb-6">
                <Clock className="w-16 h-16 text-blue-600 animate-pulse" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Analyzing Breath Sample</h2>
              <p className="text-gray-600 mb-8">Please wait while sensors continue collecting data...</p>
              <div className="text-6xl font-bold text-blue-600 mb-4">{countdown}</div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-1000"
                  style={{ width: `${((35 - countdown) / 35) * 100}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-4">MICRO CONTROLLER collecting additional readings... {countdown}s remaining</p>
            </>
          )}

          {phase === 'processing' && (
            <>
              <div className="inline-block p-6 bg-purple-100 rounded-full mb-6">
                <BarChart3 className="w-16 h-16 text-purple-600 animate-spin" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Processing Data</h2>
              <p className="text-gray-600 mb-8">Calculating results from sensor readings...</p>
              <div className="text-6xl font-bold text-purple-600 mb-4">{countdown}</div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-purple-600 h-3 rounded-full transition-all duration-1000"
                  style={{ width: `${((5 - countdown) / 5) * 100}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-4">Finalizing analysis...</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Results Page
// function ResultsPage({ navigateTo, patientData, sessionData, currentSessionId }) {
//   const [results, setResults] = useState(null);
//   const [showSessionSummary, setShowSessionSummary] = useState(false);
//   const [sessionSummary, setSessionSummary] = useState(null);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     calculateResults();
//   }, []);

//   const calculateResults = async () => {
//     try {
//       // Wait a bit for data to be written to Firestore
//       await new Promise(resolve => setTimeout(resolve, 2000));
      
//       // Fetch sensor data
//       const readings = await firestoreAPI.getCollection(
//         `patients/${patientData.id}/sessions/${currentSessionId}/subsessions/${sessionData.id}/sensor_data`
//       );

//       if (!readings || readings.length === 0) {
//         // If no data, create dummy results for testing
//         console.warn('No sensor data found, using default values');
//         setResults({
//           avgLowestSGP40: '0.00',
//           avgHighestMQ2: '0.00',
//           avgTemp: '0.00',
//           avgHumidity: '0.00',
//           chartData: []
//         });
//         setError('No sensor data was collected during this session.');
//         return;
//       }

//       const sgp40Values = readings.map(r => r.sgp40_raw || 0).sort((a, b) => a - b);
//       const mq2Values = readings.map(r => r.mq2_adc || 0).sort((a, b) => b - a);
      
//       const avgLowestSGP40 = sgp40Values.slice(0, Math.min(10, sgp40Values.length))
//         .reduce((a, b) => a + b, 0) / Math.min(10, sgp40Values.length);
      
//       const avgHighestMQ2 = mq2Values.slice(0, Math.min(10, mq2Values.length))
//         .reduce((a, b) => a + b, 0) / Math.min(10, mq2Values.length);
      
//       const avgTemp = readings.reduce((a, b) => a + (b.temperature || 0), 0) / readings.length;
//       const avgHumidity = readings.reduce((a, b) => a + (b.humidity || 0), 0) / readings.length;

//       const chartData = readings.map((r, idx) => ({
//         index: idx + 1,
//         temperature: r.temperature || 0,
//         humidity: r.humidity || 0,
//         sgp40: r.sgp40_raw || 0,
//         mq2: r.mq2_adc || 0
//       }));

//       const resultData = {
//         avgLowestSGP40: avgLowestSGP40.toFixed(2),
//         avgHighestMQ2: avgHighestMQ2.toFixed(2),
//         avgTemp: avgTemp.toFixed(2),
//         avgHumidity: avgHumidity.toFixed(2),
//         chartData
//       };

//       setResults(resultData);

//       await firestoreAPI.setDoc(
//         `patients/${patientData.id}/sessions/${currentSessionId}/subsessions/${sessionData.id}/subsession_result`,
//         {
//           avgLowestSGP40: parseFloat(avgLowestSGP40.toFixed(2)),
//           avgHighestMQ2: parseFloat(avgHighestMQ2.toFixed(2)),
//           avgTemp: parseFloat(avgTemp.toFixed(2)),
//           avgHumidity: parseFloat(avgHumidity.toFixed(2)),
//           timestamp: new Date().toISOString()
//         }
//       );
//     } catch (err) {
//       console.error('Error calculating results:', err);
//       setError('Error loading results. Please try again.');
//       // Set default results so the page doesn't hang
//       setResults({
//         avgLowestSGP40: '0.00',
//         avgHighestMQ2: '0.00',
//         avgTemp: '0.00',
//         avgHumidity: '0.00',
//         chartData: []
//       });
//     }
//   };

//   const loadSessionSummary = async () => {
//     try {
//       const subsessions = await firestoreAPI.getCollection(
//         `patients/${patientData.id}/sessions/${currentSessionId}/subsessions`
//       );

//       const subsessionResults = await Promise.all(
//         subsessions.map(async (subsession) => {
//           const resultsDoc = await firestoreAPI.getDoc(
//             `patients/${patientData.id}/sessions/${currentSessionId}/subsessions/${subsession._id}/subsession_result`
//           );
//           return resultsDoc ? { id: subsession._id, ...resultsDoc } : null;
//         })
//       );

//       const validResults = subsessionResults.filter(r => r !== null);

//       if (validResults.length > 0) {
//         const avgTemp = validResults.reduce((a, b) => a + b.avgTemp, 0) / validResults.length;
//         const avgHumidity = validResults.reduce((a, b) => a + b.avgHumidity, 0) / validResults.length;
//         const avgLowestSGP40 = validResults.reduce((a, b) => a + b.avgLowestSGP40, 0) / validResults.length;
//         const avgHighestMQ2 = validResults.reduce((a, b) => a + b.avgHighestMQ2, 0) / validResults.length;

//         const sessionResultData = {
//           avgTemp: avgTemp.toFixed(2),
//           avgHumidity: avgHumidity.toFixed(2),
//           avgLowestSGP40: avgLowestSGP40.toFixed(2),
//           avgHighestMQ2: avgHighestMQ2.toFixed(2),
//           subsessionCount: validResults.length,
//           subsessions: validResults
//         };

//         setSessionSummary(sessionResultData);

//         await firestoreAPI.setDoc(
//           `patients/${patientData.id}/sessions/${currentSessionId}/session_result`,
//           {
//             avgLowestSGP40: parseFloat(avgLowestSGP40.toFixed(2)),
//             avgHighestMQ2: parseFloat(avgHighestMQ2.toFixed(2)),
//             avgTemp: parseFloat(avgTemp.toFixed(2)),
//             avgHumidity: parseFloat(avgHumidity.toFixed(2)),
//             subsessionCount: validResults.length,
//             timestamp: new Date().toISOString()
//           }
//         );
//       }

//       setShowSessionSummary(true);
//     } catch (err) {
//       console.error('Error loading session summary:', err);
//     }
//   };

//   const handleRetakeSubsession = async () => {
//     const subsessions = await firestoreAPI.getCollection(
//       `patients/${patientData.id}/sessions/${currentSessionId}/subsessions`
//     );
//     const newSubsessionNumber = subsessions.length + 1;
//     const subsessionId = `subsession_${String(newSubsessionNumber).padStart(3, '0')}`;
    
//     await firestoreAPI.setDoc(
//       `patients/${patientData.id}/sessions/${currentSessionId}/subsessions/${subsessionId}`,
//       {
//         subsession_ID: subsessionId,
//         timestamp: new Date().toISOString(),
//         status: 'in_progress'
//       }
//     );

//     navigateTo('diagnosis', {
//       patient: patientData,
//       session: { id: subsessionId, number: newSubsessionNumber },
//       currentSessionId: currentSessionId
//     });
//   };

//   const downloadCompleteSessionExcel = async () => {
//     try {
//       const subsessions = await firestoreAPI.getCollection(
//         `patients/${patientData.id}/sessions/${currentSessionId}/subsessions`
//       );

//       const wb = XLSX.utils.book_new();

//       for (const subsession of subsessions) {
//         const sensorData = await firestoreAPI.getCollection(
//           `patients/${patientData.id}/sessions/${currentSessionId}/subsessions/${subsession._id}/sensor_data`
//         );

//         if (sensorData.length > 0) {
//           const ws = XLSX.utils.json_to_sheet(
//             sensorData.map(data => ({
//               Temperature: data.temperature,
//               Humidity: data.humidity,
//               SGP40: data.sgp40_raw,
//               MQ2: data.mq2_adc,
//               Timestamp: data.timestamp
//             }))
//           );

//           XLSX.utils.book_append_sheet(wb, ws, subsession._id.substring(0, 31));
//         }
//       }

//       XLSX.writeFile(wb, `${patientData.id}_${currentSessionId}_complete.xlsx`);
//     } catch (err) {
//       console.error('Error downloading session Excel:', err);
//     }
//   };

//   if (!results) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
//           <p className="text-gray-600">Loading results...</p>
//           <p className="text-sm text-gray-500 mt-2">Fetching sensor data from database...</p>
//           {error && (
//             <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
//               <p className="text-red-600">{error}</p>
//               <button
//                 onClick={() => navigateTo('login')}
//                 className="mt-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
//               >
//                 Return to Login
//               </button>
//             </div>
//           )}
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen p-6">
//       <div className="max-w-7xl mx-auto">
//         {error && (
//           <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
//             <p className="text-yellow-800">{error}</p>
//           </div>
//         )}
        
//         <div className="mb-8">
//           <h1 className="text-3xl font-bold text-gray-800 mb-2">Subsession Results</h1>
//           <p className="text-gray-600">
//             Session: {currentSessionId} - Subsession #{sessionData.number} - {patientData.name} ({patientData.id})
//           </p>
//         </div>

//         <div className="grid md:grid-cols-4 gap-6 mb-8">
//           <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
//             <p className="text-blue-100 text-sm mb-2">Body Temperature</p>
//             <p className="text-3xl font-bold">{results.avgTemp}°C</p>
//           </div>

//           <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
//             <p className="text-green-100 text-sm mb-2">Humidity in Body</p>
//             <p className="text-3xl font-bold">{results.avgHumidity}%</p>
//           </div>

//           <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
//             <p className="text-purple-100 text-sm mb-2">SENSOR_1</p>
//             <p className="text-3xl font-bold">{results.avgLowestSGP40}</p>
//           </div>

//           <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
//             <p className="text-orange-100 text-sm mb-2">SENSOR_2</p>
//             <p className="text-3xl font-bold">{results.avgHighestMQ2}</p>
//           </div>
//         </div>

//         <div className="grid md:grid-cols-2 gap-6 mb-8">
//           <div className="bg-white rounded-xl shadow-lg p-6">
//             <h3 className="text-lg font-bold text-gray-800 mb-4">Temperature (°C)</h3>
//             {results.chartData.length > 0 ? (
//               <>
//                 <div className="h-64 flex items-end justify-around gap-1 border-b-2 border-l-2 border-gray-300 p-4">
//                   {results.chartData.slice(0, 20).map((data, idx) => {
//                     const maxTemp = Math.max(...results.chartData.map(d => d.temperature));
//                     const minTemp = Math.min(...results.chartData.map(d => d.temperature));
//                     const height = maxTemp === minTemp ? 100 : ((data.temperature - minTemp) / (maxTemp - minTemp)) * 200 + 20;
//                     return (
//                       <div key={idx} className="flex flex-col items-center flex-1 group relative">
//                         <div 
//                           className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
//                           style={{ height: `${height}px` }}
//                         />
//                         <div className="absolute -top-8 opacity-0 group-hover:opacity-100 bg-gray-800 text-white text-xs px-2 py-1 rounded">
//                           {data.temperature.toFixed(1)}°C
//                         </div>
//                       </div>
//                     );
//                   })}
//                 </div>
//                 <div className="flex justify-between mt-2 text-xs text-gray-600">
//                   <span>Start</span>
//                   <span>Time →</span>
//                   <span>End</span>
//                 </div>
//               </>
//             ) : (
//               <div className="h-64 flex items-center justify-center text-gray-400">
//                 No data available
//               </div>
//             )}
//           </div>

//           <div className="bg-white rounded-xl shadow-lg p-6">
//             <h3 className="text-lg font-bold text-gray-800 mb-4">Humidity (%)</h3>
//             {results.chartData.length > 0 ? (
//               <>
//                 <div className="h-64 flex items-end justify-around gap-1 border-b-2 border-l-2 border-gray-300 p-4">
//                   {results.chartData.slice(0, 20).map((data, idx) => {
//                     const maxHum = Math.max(...results.chartData.map(d => d.humidity));
//                     const minHum = Math.min(...results.chartData.map(d => d.humidity));
//                     const height = maxHum === minHum ? 100 : ((data.humidity - minHum) / (maxHum - minHum)) * 200 + 20;
//                     return (
//                       <div key={idx} className="flex flex-col items-center flex-1 group relative">
//                         <div 
//                           className="w-full bg-green-500 rounded-t transition-all hover:bg-green-600"
//                           style={{ height: `${height}px` }}
//                         />
//                         <div className="absolute -top-8 opacity-0 group-hover:opacity-100 bg-gray-800 text-white text-xs px-2 py-1 rounded">
//                           {data.humidity.toFixed(1)}%
//                         </div>
//                       </div>
//                     );
//                   })}
//                 </div>
//                 <div className="flex justify-between mt-2 text-xs text-gray-600">
//                   <span>Start</span>
//                   <span>Time →</span>
//                   <span>End</span>
//                 </div>
//               </>
//             ) : (
//               <div className="h-64 flex items-center justify-center text-gray-400">
//                 No data available
//               </div>
//             )}
//           </div>

//           <div className="bg-white rounded-xl shadow-lg p-6">
//             <h3 className="text-lg font-bold text-gray-800 mb-4">SENSOR_1 VALUES</h3>
//             {results.chartData.length > 0 ? (
//               <>
//                 <div className="h-64 flex items-end justify-around gap-1 border-b-2 border-l-2 border-gray-300 p-4">
//                   {results.chartData.slice(0, 20).map((data, idx) => {
//                     const maxSgp = Math.max(...results.chartData.map(d => d.sgp40));
//                     const minSgp = Math.min(...results.chartData.map(d => d.sgp40));
//                     const height = maxSgp === minSgp ? 100 : ((data.sgp40 - minSgp) / (maxSgp - minSgp)) * 200 + 20;
//                     return (
//                       <div key={idx} className="flex flex-col items-center flex-1 group relative">
//                         <div 
//                           className="w-full bg-purple-500 rounded-t transition-all hover:bg-purple-600"
//                           style={{ height: `${height}px` }}
//                         />
//                         <div className="absolute -top-8 opacity-0 group-hover:opacity-100 bg-gray-800 text-white text-xs px-2 py-1 rounded">
//                           {data.sgp40}
//                         </div>
//                       </div>
//                     );
//                   })}
//                 </div>
//                 <div className="flex justify-between mt-2 text-xs text-gray-600">
//                   <span>Start</span>
//                   <span>Time →</span>
//                   <span>End</span>
//                 </div>
//               </>
//             ) : (
//               <div className="h-64 flex items-center justify-center text-gray-400">
//                 No data available
//               </div>
//             )}
//           </div>

//           <div className="bg-white rounded-xl shadow-lg p-6">
//             <h3 className="text-lg font-bold text-gray-800 mb-4">SENSOR_2 VALUES</h3>
//             {results.chartData.length > 0 ? (
//               <>
//                 <div className="h-64 flex items-end justify-around gap-1 border-b-2 border-l-2 border-gray-300 p-4">
//                   {results.chartData.slice(0, 20).map((data, idx) => {
//                     const maxMq = Math.max(...results.chartData.map(d => d.mq2));
//                     const minMq = Math.min(...results.chartData.map(d => d.mq2));
//                     const height = maxMq === minMq ? 100 : ((data.mq2 - minMq) / (maxMq - minMq)) * 200 + 20;
//                     return (
//                       <div key={idx} className="flex flex-col items-center flex-1 group relative">
//                         <div 
//                           className="w-full bg-orange-500 rounded-t transition-all hover:bg-orange-600"
//                           style={{ height: `${height}px` }}
//                         />
//                         <div className="absolute -top-8 opacity-0 group-hover:opacity-100 bg-gray-800 text-white text-xs px-2 py-1 rounded">
//                           {data.mq2}
//                         </div>
//                       </div>
//                     );
//                   })}
//                 </div>
//                 <div className="flex justify-between mt-2 text-xs text-gray-600">
//                   <span>Start</span>
//                   <span>Time →</span>
//                   <span>End</span>
//                 </div>
//               </>
//             ) : (
//               <div className="h-64 flex items-center justify-center text-gray-400">
//                 No data available
//               </div>
//             )}
//           </div>
//         </div>

//         <div className="grid md:grid-cols-3 gap-4 mb-8">
//           <button
//             onClick={handleRetakeSubsession}
//             className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition"
//           >
//             Retake Subsession
//           </button>

//           <button
//             onClick={loadSessionSummary}
//             className="bg-gradient-to-r from-green-500 to-green-600 text-white py-4 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition"
//           >
//             View Session Result
//           </button>
          
//           <button
//             onClick={() => navigateTo('login')}
//             className="bg-white border-2 border-gray-300 text-gray-700 py-4 rounded-lg font-semibold hover:border-blue-500 hover:text-blue-600 transition"
//           >
//             Return to Login
//           </button>
//         </div>

//         {showSessionSummary && sessionSummary && (
//           <div className="bg-white rounded-xl shadow-lg p-8">
//             <div className="flex items-center justify-between mb-6">
//               <h2 className="text-2xl font-bold text-gray-800">Session Result - {currentSessionId}</h2>
//               <button
//                 onClick={downloadCompleteSessionExcel}
//                 className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
//               >
//                 <Download className="w-4 h-4" />
//                 Download Complete Session
//               </button>
//             </div>

//             <div className="grid md:grid-cols-4 gap-6 mb-6">
//               <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
//                 <p className="text-sm text-blue-600 mb-1">Body Temperature</p>
//                 <p className="text-2xl font-bold text-blue-700">{sessionSummary.avgTemp}°C</p>
//               </div>
//               <div className="bg-green-50 p-4 rounded-lg border border-green-200">
//                 <p className="text-sm text-green-600 mb-1">Humidity in Body</p>
//                 <p className="text-2xl font-bold text-green-700">{sessionSummary.avgHumidity}%</p>
//               </div>
//               <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
//                 <p className="text-sm text-purple-600 mb-1">SENSOR_1</p>
//                 <p className="text-2xl font-bold text-purple-700">{sessionSummary.avgLowestSGP40}</p>
//               </div>
//               <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
//                 <p className="text-sm text-orange-600 mb-1">SENSOR_2</p>
//                 <p className="text-2xl font-bold text-orange-700">{sessionSummary.avgHighestMQ2}</p>
//               </div>
//             </div>

//             <div className="mb-4">
//               <p className="text-gray-600">Total Subsessions: {sessionSummary.subsessionCount}</p>
//             </div>

//             <div className="space-y-3">
//               <h3 className="font-semibold text-gray-800">Subsession Breakdown:</h3>
//               {sessionSummary.subsessions.map((subsession, idx) => (
//                 <div key={idx} className="bg-gray-50 p-4 rounded-lg">
//                   <p className="font-semibold text-gray-800 mb-2">{subsession.id}</p>
//                   <div className="grid grid-cols-4 gap-4 text-sm">
//                     <div>
//                       <p className="text-gray-600">Temp:</p>
//                       <p className="font-semibold">{subsession.avgTemp}°C</p>
//                     </div>
//                     <div>
//                       <p className="text-gray-600">Humidity:</p>
//                       <p className="font-semibold">{subsession.avgHumidity}%</p>
//                     </div>
//                     <div>
//                       <p className="text-gray-600">SGP40:</p>
//                       <p className="font-semibold">{subsession.avgLowestSGP40}</p>
//                     </div>
//                     <div>
//                       <p className="text-gray-600">MQ2:</p>
//                       <p className="font-semibold">{subsession.avgHighestMQ2}</p>
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }


// Results Page Component - UPDATED VERSION
function ResultsPage({ navigateTo, patientData, sessionData, currentSessionId }) {
  const [results, setResults] = useState(null);
  const [showSessionSummary, setShowSessionSummary] = useState(false);
  const [sessionSummary, setSessionSummary] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    calculateResults();
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup: Clear display request when leaving results page
      firestoreAPI.clearSessionResultRequest().catch(err => {
        console.log('Failed to clear display request:', err);
      });
    };
  }, []);

  const calculateResults = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const readings = await firestoreAPI.getCollection(
        `patients/${patientData.id}/sessions/${currentSessionId}/subsessions/${sessionData.id}/sensor_data`
      );

      if (!readings || readings.length === 0) {
        setError('No sensor data collected. Please check microcontroller connection.');
        setResults({ avgLowestSGP40: '0.00', avgHighestMQ2: '0.00', avgTemp: '0.00', avgHumidity: '0.00', chartData: [] });
        return;
      }

      // Calculate 10 lowest SGP40 values
      const sgp40Values = readings.map(r => r.sgp40_raw || 0).sort((a, b) => a - b);
      const avgLowestSGP40 = sgp40Values.slice(0, Math.min(10, sgp40Values.length))
        .reduce((a, b) => a + b, 0) / Math.min(10, sgp40Values.length);
      
      // Calculate 10 highest MQ2 values
      const mq2Values = readings.map(r => r.mq2_adc || 0).sort((a, b) => b - a);
      const avgHighestMQ2 = mq2Values.slice(0, Math.min(10, mq2Values.length))
        .reduce((a, b) => a + b, 0) / Math.min(10, mq2Values.length);
      
      // Calculate average temperature and humidity
      const avgTemp = readings.reduce((a, b) => a + (b.temperature || 0), 0) / readings.length;
      const avgHumidity = readings.reduce((a, b) => a + (b.humidity || 0), 0) / readings.length;

      const chartData = readings.map((r, idx) => ({
        index: idx + 1,
        temperature: r.temperature || 0,
        humidity: r.humidity || 0,
        sgp40: r.sgp40_raw || 0,
        mq2: r.mq2_adc || 0
      }));

      const resultData = {
        avgLowestSGP40: avgLowestSGP40.toFixed(2),
        avgHighestMQ2: avgHighestMQ2.toFixed(2),
        avgTemp: avgTemp.toFixed(2),
        avgHumidity: avgHumidity.toFixed(2),
        chartData
      };

      setResults(resultData);

      // STORE RESULTS IN SUBSESSION
      await firestoreAPI.setDoc(
        `patients/${patientData.id}/sessions/${currentSessionId}/subsessions/${sessionData.id}`,
        {
          subsession_ID: sessionData.id,
          timestamp: new Date().toISOString(),
          status: 'completed',
          avgLowestSGP40: parseFloat(avgLowestSGP40.toFixed(2)),
          avgHighestMQ2: parseFloat(avgHighestMQ2.toFixed(2)),
          avgTemp: parseFloat(avgTemp.toFixed(2)),
          avgHumidity: parseFloat(avgHumidity.toFixed(2))
        }
      );
    } catch (err) {
      console.error('Error calculating results:', err);
      setError('Error loading results. Please try again.');
      setResults({ avgLowestSGP40: '0.00', avgHighestMQ2: '0.00', avgTemp: '0.00', avgHumidity: '0.00', chartData: [] });
    }
  };

  // const loadSessionSummary = async () => {
  //   try {
  //     const subsessions = await firestoreAPI.getCollection(
  //       `patients/${patientData.id}/sessions/${currentSessionId}/subsessions`
  //     );

  //     // Filter subsessions that have results
  //     const validResults = subsessions.filter(s => s.avgTemp !== undefined);

  //     if (validResults.length > 0) {
  //       const avgTemp = validResults.reduce((a, b) => a + b.avgTemp, 0) / validResults.length;
  //       const avgHumidity = validResults.reduce((a, b) => a + b.avgHumidity, 0) / validResults.length;
  //       const avgLowestSGP40 = validResults.reduce((a, b) => a + b.avgLowestSGP40, 0) / validResults.length;
  //       const avgHighestMQ2 = validResults.reduce((a, b) => a + b.avgHighestMQ2, 0) / validResults.length;

  //       const sessionResultData = {
  //         avgTemp: avgTemp.toFixed(2),
  //         avgHumidity: avgHumidity.toFixed(2),
  //         avgLowestSGP40: avgLowestSGP40.toFixed(2),
  //         avgHighestMQ2: avgHighestMQ2.toFixed(2),
  //         subsessionCount: validResults.length,
  //         subsessions: validResults
  //       };

  //       setSessionSummary(sessionResultData);

  //       // UPDATE SESSION WITH RESULTS (preserves existing data)
  //       // UPDATE SESSION WITH RESULTS (preserves existing data)
  //      // UPDATE SESSION WITH RESULTS (preserves existing data)
  //       await firestoreAPI.updateDoc(
  //         `patients/${patientData.id}/sessions/${currentSessionId}`,
  //         {
  //           status: 'completed',
  //           avgLowestSGP40: parseFloat(avgLowestSGP40.toFixed(2)),
  //           avgHighestMQ2: parseFloat(avgHighestMQ2.toFixed(2)),
  //           avgTemp: parseFloat(avgTemp.toFixed(2)),
  //           avgHumidity: parseFloat(avgHumidity.toFixed(2)),
  //           subsessionCount: validResults.length,
  //           resultsTimestamp: new Date().toISOString()
  //         }
  //       );
  //     }

  //     setShowSessionSummary(true);
  //   } catch (err) {
  //     console.error('Error loading session summary:', err);
  //   }
  // };


  // const loadSessionSummary = async () => {
  //   try {
  //     const subsessions = await firestoreAPI.getCollection(
  //       `patients/${patientData.id}/sessions/${currentSessionId}/subsessions`
  //     );

  //     // Filter subsessions that have results
  //     const validResults = subsessions.filter(s => s.avgTemp !== undefined);

  //     if (validResults.length > 0) {
  //       const avgTemp = validResults.reduce((a, b) => a + b.avgTemp, 0) / validResults.length;
  //       const avgHumidity = validResults.reduce((a, b) => a + b.avgHumidity, 0) / validResults.length;
  //       const avgLowestSGP40 = validResults.reduce((a, b) => a + b.avgLowestSGP40, 0) / validResults.length;
  //       const avgHighestMQ2 = validResults.reduce((a, b) => a + b.avgHighestMQ2, 0) / validResults.length;

  //       const sessionResultData = {
  //         avgTemp: avgTemp.toFixed(2),
  //         avgHumidity: avgHumidity.toFixed(2),
  //         avgLowestSGP40: avgLowestSGP40.toFixed(2),
  //         avgHighestMQ2: avgHighestMQ2.toFixed(2),
  //         subsessionCount: validResults.length,
  //         subsessions: validResults
  //       };

  //       setSessionSummary(sessionResultData);

  //       // ONLY UPDATE RESULT FIELDS - preserves all existing session data
  //       await firestoreAPI.updateDoc(
  //         `patients/${patientData.id}/sessions/${currentSessionId}`,
  //         {
  //           avgLowestSGP40: parseFloat(avgLowestSGP40.toFixed(2)),
  //           avgHighestMQ2: parseFloat(avgHighestMQ2.toFixed(2)),
  //           avgTemp: parseFloat(avgTemp.toFixed(2)),
  //           avgHumidity: parseFloat(avgHumidity.toFixed(2)),
  //           subsessionCount: validResults.length,
  //           resultsTimestamp: new Date().toISOString(),
  //           status: 'completed'
  //         }
  //       );
  //     }

  //     setShowSessionSummary(true);
  //   } catch (err) {
  //     console.error('Error loading session summary:', err);
  //   }
  // };


  // const loadSessionSummary = async () => {
  //   try {
  //     const subsessions = await firestoreAPI.getCollection(
  //       `patients/${patientData.id}/sessions/${currentSessionId}/subsessions`
  //     );

  //     // Filter subsessions that have results
  //     const validResults = subsessions.filter(s => s.avgTemp !== undefined);

  //     if (validResults.length > 0) {
  //       const avgTemp = validResults.reduce((a, b) => a + b.avgTemp, 0) / validResults.length;
  //       const avgHumidity = validResults.reduce((a, b) => a + b.avgHumidity, 0) / validResults.length;
  //       const avgLowestSGP40 = validResults.reduce((a, b) => a + b.avgLowestSGP40, 0) / validResults.length;
  //       const avgHighestMQ2 = validResults.reduce((a, b) => a + b.avgHighestMQ2, 0) / validResults.length;

  //       const sessionResultData = {
  //         avgTemp: avgTemp.toFixed(2),
  //         avgHumidity: avgHumidity.toFixed(2),
  //         avgLowestSGP40: avgLowestSGP40.toFixed(2),
  //         avgHighestMQ2: avgHighestMQ2.toFixed(2),
  //         subsessionCount: validResults.length,
  //         subsessions: validResults
  //       };

  //       setSessionSummary(sessionResultData);

  //       // FETCH EXISTING SESSION DATA FIRST
  //       const existingSession = await firestoreAPI.getDoc(
  //         `patients/${patientData.id}/sessions/${currentSessionId}`
  //       );

  //       // MERGE EXISTING DATA WITH NEW RESULT FIELDS
  //       await firestoreAPI.updateDoc(
  //         `patients/${patientData.id}/sessions/${currentSessionId}`,
  //         {
  //           // Preserve existing session details
  //           session_ID: existingSession?.session_ID || currentSessionId,
  //           patientName: existingSession?.patientName || patientData.name,
  //           patientId: existingSession?.patientId || patientData.id,
  //           mealTime: existingSession?.mealTime,
  //           alcoholConsumption: existingSession?.alcoholConsumption,
  //           bloodGlucose: existingSession?.bloodGlucose,
  //           sessionDuration: existingSession?.sessionDuration,
  //           createdAt: existingSession?.createdAt,
            
  //           // Add/Update result fields
  //           avgLowestSGP40: parseFloat(avgLowestSGP40.toFixed(2)),
  //           avgHighestMQ2: parseFloat(avgHighestMQ2.toFixed(2)),
  //           avgTemp: parseFloat(avgTemp.toFixed(2)),
  //           avgHumidity: parseFloat(avgHumidity.toFixed(2)),
  //           subsessionCount: validResults.length,
  //           resultsTimestamp: new Date().toISOString(),
  //           status: 'completed'
  //         }
  //       );
  //     }

  //     setShowSessionSummary(true);
  //   } catch (err) {
  //     console.error('Error loading session summary:', err);
  //   }
  // };

  const loadSessionSummary = async () => {
    try {
      const subsessions = await firestoreAPI.getCollection(
        `patients/${patientData.id}/sessions/${currentSessionId}/subsessions`
      );

      // Filter subsessions that have results
      const validResults = subsessions.filter(s => s.avgTemp !== undefined);

      if (validResults.length > 0) {
        const avgTemp = validResults.reduce((a, b) => a + b.avgTemp, 0) / validResults.length;
        const avgHumidity = validResults.reduce((a, b) => a + b.avgHumidity, 0) / validResults.length;
        const avgLowestSGP40 = validResults.reduce((a, b) => a + b.avgLowestSGP40, 0) / validResults.length;
        const avgHighestMQ2 = validResults.reduce((a, b) => a + b.avgHighestMQ2, 0) / validResults.length;

        const sessionResultData = {
          avgTemp: avgTemp.toFixed(2),
          avgHumidity: avgHumidity.toFixed(2),
          avgLowestSGP40: avgLowestSGP40.toFixed(2),
          avgHighestMQ2: avgHighestMQ2.toFixed(2),
          subsessionCount: validResults.length,
          subsessions: validResults
        };

        setSessionSummary(sessionResultData);

        // FETCH EXISTING SESSION DATA FIRST
        const existingSession = await firestoreAPI.getDoc(
          `patients/${patientData.id}/sessions/${currentSessionId}`
        );

        // MERGE EXISTING DATA WITH NEW RESULT FIELDS
        await firestoreAPI.updateDoc(
          `patients/${patientData.id}/sessions/${currentSessionId}`,
          {
            // Preserve existing session details
            session_ID: existingSession?.session_ID || currentSessionId,
            patientName: existingSession?.patientName || patientData.name,
            patientId: existingSession?.patientId || patientData.id,
            mealTime: existingSession?.mealTime,
            alcoholConsumption: existingSession?.alcoholConsumption,
            bloodGlucose: existingSession?.bloodGlucose,
            sessionDuration: existingSession?.sessionDuration,
            createdAt: existingSession?.createdAt,
            
            // Add/Update result fields
            avgLowestSGP40: parseFloat(avgLowestSGP40.toFixed(2)),
            avgHighestMQ2: parseFloat(avgHighestMQ2.toFixed(2)),
            avgTemp: parseFloat(avgTemp.toFixed(2)),
            avgHumidity: parseFloat(avgHumidity.toFixed(2)),
            subsessionCount: validResults.length,
            resultsTimestamp: new Date().toISOString(),
            status: 'completed'
          }
        );

        // *** SEND DISPLAY REQUEST TO ESP32 ***
        const requestSent = await firestoreAPI.createSessionResultRequest(currentSessionId);
        
        if (requestSent) {
          alert('✅ Session result sent to OLED display!\n\nCheck your ESP32:\n• OLED Screen\n• Serial Monitor');
        } else {
          alert('⚠️ Results saved, but failed to send to ESP32. Please check your connection.');
        }
      }

      setShowSessionSummary(true);
    } catch (err) {
      console.error('Error loading session summary:', err);
      alert('❌ Error loading session summary. Please try again.');
    }
  };

  const handleRetakeSubsession = async () => {
    const subsessions = await firestoreAPI.getCollection(
      `patients/${patientData.id}/sessions/${currentSessionId}/subsessions`
    );
    const newSubsessionNumber = subsessions.length + 1;
    const subsessionId = `subsession_${String(newSubsessionNumber).padStart(3, '0')}`;
    
    await firestoreAPI.setDoc(
      `patients/${patientData.id}/sessions/${currentSessionId}/subsessions/${subsessionId}`,
      {
        subsession_ID: subsessionId,
        timestamp: new Date().toISOString(),
        status: 'in_progress'
      }
    );

    navigateTo('diagnosis', {
      patient: patientData,
      session: { id: subsessionId, number: newSubsessionNumber },
      currentSessionId: currentSessionId
    });
  };

const downloadCompleteSessionExcel = async () => {
  try {
    // Get session document with details
    const sessionDoc = await firestoreAPI.getDoc(`patients/${patientData.id}/sessions/${currentSessionId}`);
    
    const subsessions = await firestoreAPI.getCollection(
      `patients/${patientData.id}/sessions/${currentSessionId}/subsessions`
    );

    const wb = XLSX.utils.book_new();

    // Sheet 1: Session Information
    const sessionInfo = [
      ['Patient Name', sessionDoc?.patientName || patientData.name],
      ['Patient ID', sessionDoc?.patientId || patientData.id],
      ['Session ID', currentSessionId],
      [''],
      ['Session Details'],
      ['Meal Time', sessionDoc?.mealTime || 'N/A'],
      ['Alcohol Consumption', sessionDoc?.alcoholConsumption || 'N/A'],
      ['Blood Glucose Level (mg/dL)', sessionDoc?.bloodGlucose || 'N/A'],
      ['Session Duration (Time of Day)', sessionDoc?.sessionDuration || 'N/A'],
      ['Session Timestamp', sessionDoc?.timestamp ? new Date(sessionDoc.timestamp).toLocaleString() : 'N/A'],
      [''],
      ['Total Subsessions', subsessions.length]
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(sessionInfo);
    XLSX.utils.book_append_sheet(wb, ws1, 'Session Info');

    // Remaining sheets: One for each subsession
    for (const subsession of subsessions) {
      const sensorData = await firestoreAPI.getCollection(
        `patients/${patientData.id}/sessions/${currentSessionId}/subsessions/${subsession._id}/sensor_data`
      );

      if (sensorData.length > 0) {
        const ws = XLSX.utils.json_to_sheet(
          sensorData.map(data => {
            let timestamp = 'N/A';
            if (data.timestamp) {
              if (data.timestamp._seconds) {
                timestamp = new Date(data.timestamp._seconds * 1000).toLocaleString();
              } else if (typeof data.timestamp === 'string') {
                timestamp = new Date(data.timestamp).toLocaleString();
              } else if (typeof data.timestamp === 'number') {
                timestamp = new Date(data.timestamp).toLocaleString();
              }
            }
            
            return {
              Temperature: data.temperature,
              Humidity: data.humidity,
              SENSOR_1: data.sgp40_raw,
              SENSOR_2: data.mq2_adc,
              Timestamp: timestamp
            };
          })
        );

        XLSX.utils.book_append_sheet(wb, ws, subsession._id.substring(0, 31));
      }
    }

    XLSX.writeFile(wb, `${patientData.id}_${currentSessionId}_complete.xlsx`);
  } catch (err) {
    console.error('Error downloading session Excel:', err);
  }
};

  if (!results) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {error && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800">{error}</p>
          </div>
        )}
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Subsession Results</h1>
          <p className="text-gray-600">
            Session: {currentSessionId} - Subsession #{sessionData.number} - {patientData.name} ({patientData.id})
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <p className="text-blue-100 text-sm mb-2">Body Temperature</p>
            <p className="text-3xl font-bold">{results.avgTemp}°C</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <p className="text-green-100 text-sm mb-2">Body Humidity</p>
            <p className="text-3xl font-bold">{results.avgHumidity}%</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <p className="text-purple-100 text-sm mb-2">SENSOR_1</p>
            <p className="text-3xl font-bold">{results.avgLowestSGP40}</p>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
            <p className="text-orange-100 text-sm mb-2">SENSOR_2</p>
            <p className="text-3xl font-bold">{results.avgHighestMQ2}</p>
          </div>
        </div>

        {/* CONTINUOUS LINE GRAPHS */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Temperature Graph */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Body Temperature (°C)</h3>
            {results.chartData.length > 0 ? (
              <svg className="w-full h-64" viewBox="0 0 400 250">
                <defs>
                  <linearGradient id="tempGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                {[0, 1, 2, 3, 4].map(i => (
                  <line key={i} x1="40" y1={40 + i * 40} x2="380" y2={40 + i * 40} stroke="#e5e7eb" strokeWidth="1"/>
                ))}
                <line x1="40" y1="200" x2="380" y2="200" stroke="#374151" strokeWidth="2"/>
                <line x1="40" y1="40" x2="40" y2="200" stroke="#374151" strokeWidth="2"/>
                {(() => {
                  const temps = results.chartData.map(d => d.temperature);
                  const minScale = 0;
                  const maxScale = 100;
                  const points = results.chartData.map((d, i) => {
                    const x = 40 + (i / (results.chartData.length - 1)) * 340;
                    const y = 200 - ((d.temperature - minScale) / (maxScale - minScale)) * 160;
                    return `${x},${y}`;
                  }).join(' ');
                  const areaPoints = `40,200 ${points} ${40 + 340},200`;
                  return (
                    <>
                      <polygon points={areaPoints} fill="url(#tempGrad)"/>
                      <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth="2"/>
                      {results.chartData.map((d, i) => {
                        const x = 40 + (i / (results.chartData.length - 1)) * 340;
                        const y = 200 - ((d.temperature - minScale) / (maxScale - minScale)) * 160;
                        return <circle key={i} cx={x} cy={y} r="3" fill="#3b82f6"><title>{d.temperature.toFixed(1)}°C</title></circle>;
                      })}
                    </>
                  );
                })()}
                <text x="200" y="230" fontSize="12" fill="#6b7280" textAnchor="middle">Time →</text>
              </svg>
            ) : <div className="h-64 flex items-center justify-center text-gray-400">No data</div>}
          </div>

          {/* Humidity Graph */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Body Humidity (%)</h3>
            {results.chartData.length > 0 ? (
              <svg className="w-full h-64" viewBox="0 0 400 250">
                <defs>
                  <linearGradient id="humGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                {[0, 1, 2, 3, 4].map(i => (
                  <line key={i} x1="40" y1={40 + i * 40} x2="380" y2={40 + i * 40} stroke="#e5e7eb" strokeWidth="1"/>
                ))}
                <line x1="40" y1="200" x2="380" y2="200" stroke="#374151" strokeWidth="2"/>
                <line x1="40" y1="40" x2="40" y2="200" stroke="#374151" strokeWidth="2"/>
               {(() => {
                  const hums = results.chartData.map(d => d.humidity);
                  const minScale = 0;
                  const maxScale = 100;
                  const points = results.chartData.map((d, i) => {
                    const x = 40 + (i / (results.chartData.length - 1)) * 340;
                    const y = 200 - ((d.humidity - minScale) / (maxScale - minScale)) * 160;
                    return `${x},${y}`;
                  }).join(' ');
                  const areaPoints = `40,200 ${points} ${40 + 340},200`;
                  return (
                    <>
                      <polygon points={areaPoints} fill="url(#humGrad)"/>
                      <polyline points={points} fill="none" stroke="#10b981" strokeWidth="2"/>
                      {results.chartData.map((d, i) => {
                        const x = 40 + (i / (results.chartData.length - 1)) * 340;
                        const y = 200 - ((d.humidity - minScale) / (maxScale - minScale)) * 160;
                        return <circle key={i} cx={x} cy={y} r="3" fill="#10b981"><title>{d.humidity.toFixed(1)}%</title></circle>;
                      })}
                    </>
                  );
                })()}
                <text x="200" y="230" fontSize="12" fill="#6b7280" textAnchor="middle">Time →</text>
              </svg>
            ) : <div className="h-64 flex items-center justify-center text-gray-400">No data</div>}
          </div>

          {/* SENSOR_1 Graph */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">SENSOR_1 Value</h3>
            {results.chartData.length > 0 ? (
              <svg className="w-full h-64" viewBox="0 0 400 250">
                <defs>
                  <linearGradient id="sgpGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                {[0, 1, 2, 3, 4].map(i => (
                  <line key={i} x1="40" y1={40 + i * 40} x2="380" y2={40 + i * 40} stroke="#e5e7eb" strokeWidth="1"/>
                ))}
                <line x1="40" y1="200" x2="380" y2="200" stroke="#374151" strokeWidth="2"/>
                <line x1="40" y1="40" x2="40" y2="200" stroke="#374151" strokeWidth="2"/>
                {(() => {
                  const sgps = results.chartData.map(d => d.sgp40);
                  const minScale = 10000;
                  const maxScale = 35000;
                  const points = results.chartData.map((d, i) => {
                    const x = 40 + (i / (results.chartData.length - 1)) * 340;
                    const y = 200 - ((d.sgp40 - minScale) / (maxScale - minScale)) * 160;
                    return `${x},${y}`;
                  }).join(' ');
                  const areaPoints = `40,200 ${points} ${40 + 340},200`;
                  return (
                    <>
                      <polygon points={areaPoints} fill="url(#sgpGrad)"/>
                      <polyline points={points} fill="none" stroke="#a855f7" strokeWidth="2"/>
                      {results.chartData.map((d, i) => {
                        const x = 40 + (i / (results.chartData.length - 1)) * 340;
                        const y = 200 - ((d.sgp40 - minScale) / (maxScale - minScale)) * 160;
                        return <circle key={i} cx={x} cy={y} r="3" fill="#a855f7"><title>{d.sgp40}</title></circle>;
                      })}
                    </>
                  );
                })()}
                <text x="200" y="230" fontSize="12" fill="#6b7280" textAnchor="middle">Time →</text>
              </svg>
            ) : <div className="h-64 flex items-center justify-center text-gray-400">No data</div>}
          </div>

          {/* SENSOR_2 Graph */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">SENSOR_2 Value</h3>
            {results.chartData.length > 0 ? (
              <svg className="w-full h-64" viewBox="0 0 400 250">
                <defs>
                  <linearGradient id="mq2Grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#f97316" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="#f97316" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                {[0, 1, 2, 3, 4].map(i => (
                  <line key={i} x1="40" y1={40 + i * 40} x2="380" y2={40 + i * 40} stroke="#e5e7eb" strokeWidth="1"/>
                ))}
                <line x1="40" y1="200" x2="380" y2="200" stroke="#374151" strokeWidth="2"/>
                <line x1="40" y1="40" x2="40" y2="200" stroke="#374151" strokeWidth="2"/>
               {(() => {
                  const mq2s = results.chartData.map(d => d.mq2);
                  const minScale = 0;
                  const maxScale = 4500;
                  const points = results.chartData.map((d, i) => {
                    const x = 40 + (i / (results.chartData.length - 1)) * 340;
                    const y = 200 - ((d.mq2 - minScale) / (maxScale - minScale)) * 160;
                    return `${x},${y}`;
                  }).join(' ');
                  const areaPoints = `40,200 ${points} ${40 + 340},200`;
                  return (
                    <>
                      <polygon points={areaPoints} fill="url(#mq2Grad)"/>
                      <polyline points={points} fill="none" stroke="#f97316" strokeWidth="2"/>
                      {results.chartData.map((d, i) => {
                        const x = 40 + (i / (results.chartData.length - 1)) * 340;
                        const y = 200 - ((d.mq2 - minScale) / (maxScale - minScale)) * 160;
                        return <circle key={i} cx={x} cy={y} r="3" fill="#f97316"><title>{d.mq2}</title></circle>;
                      })}
                    </>
                  );
                })()}
                <text x="200" y="230" fontSize="12" fill="#6b7280" textAnchor="middle">Time →</text>
              </svg>
            ) : <div className="h-64 flex items-center justify-center text-gray-400">No data</div>}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <button onClick={handleRetakeSubsession}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition">
            Retake Subsession
          </button>
          <button onClick={loadSessionSummary}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white py-4 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition">
            View Session Result
          </button>
          <button onClick={() => navigateTo('dashboard', { patient: patientData })}
            className="bg-white border-2 border-gray-300 text-gray-700 py-4 rounded-lg font-semibold hover:border-blue-500 hover:text-blue-600 transition">
            Return to Dashboard
          </button>
        </div>

        {/* SESSION SUMMARY WITH BACK BUTTON */}
        {showSessionSummary && sessionSummary && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <button onClick={() => setShowSessionSummary(false)}
                  className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition">
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h2 className="text-2xl font-bold text-gray-800">Session Result - {currentSessionId}</h2>
              </div>
              <button onClick={downloadCompleteSessionExcel}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
                <Download className="w-4 h-4" />
                Download Complete Session
              </button>
            </div>

            <div className="grid md:grid-cols-4 gap-6 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-600 mb-1">Body Temperature</p>
                <p className="text-2xl font-bold text-blue-700">{sessionSummary.avgTemp}°C</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-sm text-green-600 mb-1">Body Humidity</p>
                <p className="text-2xl font-bold text-green-700">{sessionSummary.avgHumidity}%</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-600 mb-1">SENSOR_1</p>
                <p className="text-2xl font-bold text-purple-700">{sessionSummary.avgLowestSGP40}</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <p className="text-sm text-orange-600 mb-1">SENSOR_2</p>
                <p className="text-2xl font-bold text-orange-700">{sessionSummary.avgHighestMQ2}</p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-gray-600">Total Subsessions: {sessionSummary.subsessionCount}</p>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800">Subsession Breakdown:</h3>
              {sessionSummary.subsessions.map((sub, idx) => (
                <div key={idx} className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-semibold text-gray-800 mb-2">{sub._id}</p>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div><p className="text-gray-600">Temp:</p><p className="font-semibold">{sub.avgTemp}°C</p></div>
                    <div><p className="text-gray-600">Humidity:</p><p className="font-semibold">{sub.avgHumidity}%</p></div>
                    <div><p className="text-gray-600">Sensor 1:</p><p className="font-semibold">{sub.avgLowestSGP40}</p></div>
                    <div><p className="text-gray-600">Sensor 2:</p><p className="font-semibold">{sub.avgHighestMQ2}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function SessionSummaryPage({ navigateTo, goBack, patientData, currentSessionId }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-xl w-full">
        <button
          onClick={goBack}
          className="mb-4 flex items-center text-blue-600 hover:text-blue-700"
        >
          ← Back
        </button>

        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Session Summary
        </h1>

        <p className="text-gray-600 mb-2">
          Patient: {patientData?.name} ({patientData?.id})
        </p>

        <p className="text-gray-600 mb-6">
          Session ID: {currentSessionId}
        </p>

        <button
          onClick={() => navigateTo('dashboard')}
          className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}


// Compare Page Component
function ComparePage({ navigateTo, patientData }) {
  const [compareMode, setCompareMode] = useState('same'); // 'same' or 'different'
  const [patient1Id, setPatient1Id] = useState(patientData?.id || '');
  const [patient2Id, setPatient2Id] = useState('');
  const [patient1Data, setPatient1Data] = useState(null);
  const [patient2Data, setPatient2Data] = useState(null);
  const [patient1Sessions, setPatient1Sessions] = useState([]);
  const [patient2Sessions, setPatient2Sessions] = useState([]);
  const [selectedSession1, setSelectedSession1] = useState('');
  const [selectedSession2, setSelectedSession2] = useState('');
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (compareMode === 'same' && patientData) {
      loadPatientSessions(patientData.id, 1);
    }
  }, [compareMode]);

  const loadPatientSessions = async (patientId, patientNumber) => {
    try {
      const sessions = await firestoreAPI.getCollection(`patients/${patientId}/sessions`);
      const sessionsWithData = sessions.filter(s => s.avgTemp !== undefined);
      
      if (patientNumber === 1) {
        setPatient1Sessions(sessionsWithData);
      } else {
        setPatient2Sessions(sessionsWithData);
      }
    } catch (err) {
      console.error('Error loading sessions:', err);
      setError('Error loading sessions');
    }
  };

  const loadPatient1 = async () => {
    if (!patient1Id.trim()) {
      setError('Please enter Patient 1 ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const patientDoc = await firestoreAPI.getDoc(`patients/${patient1Id}`);
      if (patientDoc && patientDoc.basic_info) {
        setPatient1Data({ id: patient1Id, ...patientDoc.basic_info });
        await loadPatientSessions(patient1Id, 1);
      } else {
        setError('Patient 1 not found');
      }
    } catch (err) {
      setError('Error loading Patient 1');
    } finally {
      setLoading(false);
    }
  };

  const loadPatient2 = async () => {
    if (!patient2Id.trim()) {
      setError('Please enter Patient 2 ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const patientDoc = await firestoreAPI.getDoc(`patients/${patient2Id}`);
      if (patientDoc && patientDoc.basic_info) {
        setPatient2Data({ id: patient2Id, ...patientDoc.basic_info });
        await loadPatientSessions(patient2Id, 2);
      } else {
        setError('Patient 2 not found');
      }
    } catch (err) {
      setError('Error loading Patient 2');
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!selectedSession1 || !selectedSession2) {
      setError('Please select both sessions to compare');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const session1 = patient1Sessions.find(s => s._id === selectedSession1);
      const session2 = patient2Sessions.find(s => s._id === selectedSession2);

      setComparisonData({
        session1: {
          ...session1,
          patientName: patient1Data?.name || patient1Id,
          patientId: patient1Id
        },
        session2: {
          ...session2,
          patientName: patient2Data?.name || patient2Id,
          patientId: compareMode === 'same' ? patient1Id : patient2Id
        }
      });
    } catch (err) {
      setError('Error comparing sessions');
    } finally {
      setLoading(false);
    }
  };

  const resetComparison = () => {
    setComparisonData(null);
    setSelectedSession1('');
    setSelectedSession2('');
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Compare Sessions</h1>
            <p className="text-gray-600">Analyze and compare diagnostic sessions</p>
          </div>
          <button
            onClick={() => navigateTo('dashboard', { patient: patientData })}
            className="px-4 py-2 text-blue-600 hover:text-blue-700"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Mode Selection */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Comparison Mode</h2>
          <div className="flex gap-4">
            <button
              onClick={() => {
                setCompareMode('same');
                setPatient1Id(patientData?.id || '');
                setPatient2Id('');
                setPatient2Data(null);
                setPatient2Sessions([]);
                resetComparison();
              }}
              className={`flex-1 py-3 rounded-lg font-semibold transition ${
                compareMode === 'same'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Compare Same Patient
            </button>
            <button
              onClick={() => {
                setCompareMode('different');
                setPatient1Id('');
                setPatient2Id('');
                setPatient1Data(null);
                setPatient2Data(null);
                setPatient1Sessions([]);
                setPatient2Sessions([]);
                resetComparison();
              }}
              className={`flex-1 py-3 rounded-lg font-semibold transition ${
                compareMode === 'different'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Compare Different Patients
            </button>
          </div>
        </div>

        {/* Patient Selection */}
        {compareMode === 'same' ? (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Patient: {patientData?.name} ({patientData?.id})
            </h2>
            
            {patient1Sessions.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select First Session
                  </label>
                  <select
                    value={selectedSession1}
                    onChange={(e) => setSelectedSession1(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose session...</option>
                    {patient1Sessions.map((session) => (
                      <option key={session._id} value={session._id}>
                        {session._id} - {new Date(session.timestamp).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Second Session
                  </label>
                  <select
                    value={selectedSession2}
                    onChange={(e) => setSelectedSession2(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose session...</option>
                    {patient1Sessions.map((session) => (
                      <option key={session._id} value={session._id}>
                        {session._id} - {new Date(session.timestamp).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <p className="text-gray-600">No sessions available for comparison</p>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Patient 1 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Patient 1</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Patient ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={patient1Id}
                      onChange={(e) => setPatient1Id(e.target.value)}
                      placeholder="e.g., P-1"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={loadPatient1}
                      disabled={loading}
                      className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
                    >
                      Load
                    </button>
                  </div>
                </div>

                {patient1Data && (
                  <>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-blue-600">Name</p>
                      <p className="font-semibold text-gray-800">{patient1Data.name}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Session
                      </label>
                      <select
                        value={selectedSession1}
                        onChange={(e) => setSelectedSession1(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Choose session...</option>
                        {patient1Sessions.map((session) => (
                          <option key={session._id} value={session._id}>
                            {session._id} - {new Date(session.timestamp).toLocaleDateString()}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Patient 2 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Patient 2</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Patient ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={patient2Id}
                      onChange={(e) => setPatient2Id(e.target.value)}
                      placeholder="e.g., P-2"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={loadPatient2}
                      disabled={loading}
                      className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition disabled:opacity-50"
                    >
                      Load
                    </button>
                  </div>
                </div>

                {patient2Data && (
                  <>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-sm text-purple-600">Name</p>
                      <p className="font-semibold text-gray-800">{patient2Data.name}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Session
                      </label>
                      <select
                        value={selectedSession2}
                        onChange={(e) => setSelectedSession2(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">Choose session...</option>
                        {patient2Sessions.map((session) => (
                          <option key={session._id} value={session._id}>
                            {session._id} - {new Date(session.timestamp).toLocaleDateString()}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {!comparisonData && (
          <button
            onClick={handleCompare}
            disabled={loading || !selectedSession1 || !selectedSession2}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-lg font-semibold text-lg hover:from-blue-600 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Compare Sessions'}
          </button>
        )}

        {/* Comparison Results */}
        {comparisonData && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">Comparison Results</h2>
              <button
                onClick={resetComparison}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
              >
                New Comparison
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                <p className="text-blue-100 text-sm mb-2">Session 1</p>
                <p className="text-2xl font-bold mb-1">{comparisonData.session1._id}</p>
                <p className="text-blue-100">{comparisonData.session1.patientName}</p>
                <p className="text-sm text-blue-100 mt-2">
                  {new Date(comparisonData.session1.timestamp).toLocaleString()}
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                <p className="text-purple-100 text-sm mb-2">Session 2</p>
                <p className="text-2xl font-bold mb-1">{comparisonData.session2._id}</p>
                <p className="text-purple-100">{comparisonData.session2.patientName}</p>
                <p className="text-sm text-purple-100 mt-2">
                  {new Date(comparisonData.session2.timestamp).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Comparison Table */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Metric</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-blue-700">Session 1</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-purple-700">Session 2</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Difference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">Body Temperature (°C)</td>
                    <td className="px-6 py-4 text-center text-sm text-blue-600 font-semibold">
                      {comparisonData.session1.avgTemp}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-purple-600 font-semibold">
                      {comparisonData.session2.avgTemp}
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-semibold">
                      <span className={
                        (comparisonData.session2.avgTemp - comparisonData.session1.avgTemp) > 0
                          ? 'text-red-600'
                          : 'text-green-600'
                      }>
                        {(comparisonData.session2.avgTemp - comparisonData.session1.avgTemp).toFixed(2)}
                      </span>
                    </td>
                  </tr>

                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">Body Humidity (%)</td>
                    <td className="px-6 py-4 text-center text-sm text-blue-600 font-semibold">
                      {comparisonData.session1.avgHumidity}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-purple-600 font-semibold">
                      {comparisonData.session2.avgHumidity}
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-semibold">
                      <span className={
                        (comparisonData.session2.avgHumidity - comparisonData.session1.avgHumidity) > 0
                          ? 'text-red-600'
                          : 'text-green-600'
                      }>
                        {(comparisonData.session2.avgHumidity - comparisonData.session1.avgHumidity).toFixed(2)}
                      </span>
                    </td>
                  </tr>

                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">SENSOR_1 (SGP40)</td>
                    <td className="px-6 py-4 text-center text-sm text-blue-600 font-semibold">
                      {comparisonData.session1.avgLowestSGP40}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-purple-600 font-semibold">
                      {comparisonData.session2.avgLowestSGP40}
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-semibold">
                      <span className={
                        (comparisonData.session2.avgLowestSGP40 - comparisonData.session1.avgLowestSGP40) > 0
                          ? 'text-red-600'
                          : 'text-green-600'
                      }>
                        {(comparisonData.session2.avgLowestSGP40 - comparisonData.session1.avgLowestSGP40).toFixed(2)}
                      </span>
                    </td>
                  </tr>

                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">SENSOR_2 (MQ2)</td>
                    <td className="px-6 py-4 text-center text-sm text-blue-600 font-semibold">
                      {comparisonData.session1.avgHighestMQ2}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-purple-600 font-semibold">
                      {comparisonData.session2.avgHighestMQ2}
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-semibold">
                      <span className={
                        (comparisonData.session2.avgHighestMQ2 - comparisonData.session1.avgHighestMQ2) > 0
                          ? 'text-red-600'
                          : 'text-green-600'
                      }>
                        {(comparisonData.session2.avgHighestMQ2 - comparisonData.session1.avgHighestMQ2).toFixed(2)}
                      </span>
                    </td>
                  </tr>

                  <tr className="hover:bg-gray-50 bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">Subsession Count</td>
                    <td className="px-6 py-4 text-center text-sm text-blue-600 font-semibold">
                      {comparisonData.session1.subsessionCount}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-purple-600 font-semibold">
                      {comparisonData.session2.subsessionCount}
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-semibold text-gray-600">
                      {comparisonData.session2.subsessionCount - comparisonData.session1.subsessionCount}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Visual Comparison Charts */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Temperature Comparison */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Temperature Comparison (°C)</h3>
                <div className="h-64 flex items-end justify-center gap-8">
                  <div className="flex flex-col items-center">
                    <div 
                      className="w-24 bg-blue-500 rounded-t transition-all relative group"
                      style={{ height: `${(comparisonData.session1.avgTemp / 100) * 200}px` }}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100">
                        {comparisonData.session1.avgTemp}°C
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-blue-600 font-semibold">Session 1</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div 
                      className="w-24 bg-purple-500 rounded-t transition-all relative group"
                      style={{ height: `${(comparisonData.session2.avgTemp / 100) * 200}px` }}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100">
                        {comparisonData.session2.avgTemp}°C
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-purple-600 font-semibold">Session 2</p>
                  </div>
                </div>
              </div>

              {/* Humidity Comparison */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Humidity Comparison (%)</h3>
                <div className="h-64 flex items-end justify-center gap-8">
                  <div className="flex flex-col items-center">
                    <div 
                      className="w-24 bg-green-500 rounded-t transition-all relative group"
                      style={{ height: `${(comparisonData.session1.avgHumidity / 100) * 200}px` }}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100">
                        {comparisonData.session1.avgHumidity}%
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-blue-600 font-semibold">Session 1</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div 
                      className="w-24 bg-green-600 rounded-t transition-all relative group"
                      style={{ height: `${(comparisonData.session2.avgHumidity / 100) * 200}px` }}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100">
                        {comparisonData.session2.avgHumidity}%
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-purple-600 font-semibold">Session 2</p>
                  </div>
                </div>
              </div>

              {/* SENSOR_1 Comparison */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">SENSOR_1 Comparison</h3>
                <div className="h-64 flex items-end justify-center gap-8">
                  <div className="flex flex-col items-center">
                    <div 
                      className="w-24 bg-purple-400 rounded-t transition-all relative group"
                      style={{ height: `${((comparisonData.session1.avgLowestSGP40 - 10000) / 25000) * 200}px` }}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100">
                        {comparisonData.session1.avgLowestSGP40}
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-blue-600 font-semibold">Session 1</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div 
                      className="w-24 bg-purple-600 rounded-t transition-all relative group"
                      style={{ height: `${((comparisonData.session2.avgLowestSGP40 - 10000) / 25000) * 200}px` }}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-purple-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100">
                        {comparisonData.session2.avgLowestSGP40}
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-purple-600 font-semibold">Session 2</p>
                  </div>
                </div>
              </div>

         {/* SENSOR_2 Comparison */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">SENSOR_2 Comparison</h3>
                <div className="h-64 flex items-end justify-center gap-8">
                  <div className="flex flex-col items-center">
                    <div 
                      className="w-24 bg-orange-400 rounded-t transition-all relative group"
                      style={{ height: `${(comparisonData.session1.avgHighestMQ2 / 4500) * 200}px` }}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-orange-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100">
                        {comparisonData.session1.avgHighestMQ2}
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-blue-600 font-semibold">Session 1</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div 
                      className="w-24 bg-orange-600 rounded-t transition-all relative group"
                      style={{ height: `${(comparisonData.session2.avgHighestMQ2 / 4500) * 200}px` }}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-orange-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100">
                        {comparisonData.session2.avgHighestMQ2}
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-purple-600 font-semibold">Session 2</p>
                  </div>
                </div>
              </div>
            </div> {/* close Visual Comparison Charts grid */}

          </div>
        )}

      </div> 
    </div>
  );
}


export default App;