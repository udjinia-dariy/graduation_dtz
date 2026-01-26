// State management
let patients = [];
let currentPatientId = null;
let isNewPatient = false;
let predictionModels = [];
let selectedModel = null;
let availableModels = [];

// DOM elements
const patientList = document.getElementById('patientList');
const patientName = document.getElementById('patientName');
const patientStatus = document.getElementById('patientStatus');
const patientActions = document.getElementById('patientActions');
const addPatientBtn = document.getElementById('addPatientBtn');
const addReadmissionBtn = document.getElementById('addReadmissionBtn');
const saveInitialBtn = document.getElementById('saveInitialBtn');
const saveReadmissionBtn = document.getElementById('saveReadmissionBtn');
const calculateRiskBtn = document.getElementById('calculateRiskBtn');
const viewRawDataBtn = document.getElementById('viewRawDataBtn');
const deletePatientBtn = document.getElementById('deletePatientBtn');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const serverStatus = document.getElementById('serverStatus');
const modelSelectionSection = document.getElementById('modelSelectionSection');
const modelOptions = document.getElementById('modelOptions');

// Form elements
const initialForm = document.getElementById('initialForm');
const readmissionForm = document.getElementById('readmissionForm');

// API Configuration
const API_BASE_URL = window.location.origin;
const PATIENTS_ENDPOINT = '/api/patients';
const PATIENT_ENDPOINT = '/api/patient';
const MODELS_ENDPOINT = '/api/models';
const PREDICT_ENDPOINT = '/api/predict_ml';

// Initialize the application
async function initApp() {
    showMessage('Загрузка приложения...', 'info');
    
    // Check API connection
    await checkAPIStatus();
    
    // Load prediction models
    await loadPredictionModels();
    
    // Load patients from backend
    await loadPatientsFromBackend();
    
    setupEventListeners();
    
    // Auto-update ratio when FT3 or FT4 changes
    document.getElementById('ft3_1').addEventListener('input', updateRatio);
    document.getElementById('ft4_1').addEventListener('input', updateRatio);
    
    // Initialize all unknown checkboxes
    initializeUnknownCheckboxes();
    
    showMessage('Приложение готово', 'success');
}

// Check API connection status
async function checkAPIStatus() {
    try {
        serverStatus.innerHTML = '<span style="color: #666;">Проверка подключения к серверу...</span>';
        
        // Test by fetching models endpoint
        const response = await fetch(MODELS_ENDPOINT, {
            method: 'GET'
        });
        
        if (response.ok) {
            serverStatus.innerHTML = '<span style="color: green;">✅ Серверная часть: Работает</span>';
        } else {
            serverStatus.innerHTML = '<span style="color: red;">❌ Серверная часть: Ошибка</span>';
        }
    } catch (error) {
        serverStatus.innerHTML = '<span style="color: orange;">⚠️ Серверная часть: Не в сети</span>';
        console.error('API connection error:', error);
    }
}

// Load available prediction models
async function loadPredictionModels() {
    try {
        const response = await fetch(MODELS_ENDPOINT, {
            method: 'GET',
        });
        
        if (response.ok) {
            const data = await response.json();
            predictionModels = data;
            console.log('Loaded prediction models:', predictionModels);
        } else {
            console.error('Failed to load models:', await response.text());
        }
    } catch (error) {
        console.error('Error loading prediction models:', error);
    }
}

// Load patients from backend
async function loadPatientsFromBackend() {
    try {
        const response = await fetch(PATIENTS_ENDPOINT, {
            method: 'GET',
        });
        
        if (response.ok) {
            const data = await response.json();
            patients = data.map(patient => {
                return {
                    ...patient,
                    patient_data: patient.patient_data || {},
                    // Map patient_data to top-level properties for backward compatibility
                    ...patient.patient_data
                };
            });
            console.log('Loaded patients from backend:', patients);
        } else {
            console.error('Failed to load patients:', await response.text());
            patients = [];
        }
    } catch (error) {
        console.error('Error loading patients:', error);
        patients = [];
    }
    
    renderPatientList();
    
    // Select first patient by default if available
    if (patients.length > 0) {
        selectPatient(patients[0].id);
    }
}

// Save patient to backend
async function savePatientToBackend(patientData, isNew = true) {
    try {
        const endpoint = isNew ? PATIENT_ENDPOINT : `${PATIENT_ENDPOINT}/${patientData.id}`;
        const method = isNew ? 'POST' : 'PUT';
        
        const response = await fetch(endpoint, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(patientData)
        });
        
        if (response.ok) {
            const result = await response.json();
            return result;
        } else {
            const error = await response.text();
            throw new Error(error);
        }
    } catch (error) {
        console.error('Error saving patient:', error);
        throw error;
    }
}

// Delete patient from backend
async function deletePatientFromBackend(patientId) {
    try {
        const response = await fetch(`${PATIENT_ENDPOINT}/${patientId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            const result = await response.json();
            return result;
        } else {
            const error = await response.text();
            throw new Error(error);
        }
    } catch (error) {
        console.error('Error deleting patient:', error);
        throw error;
    }
}

// Render model selection based on patient status
function renderModelSelection() {
    if (!currentPatientId) {
        modelSelectionSection.style.display = 'none';
        return;
    }
    
    const patient = patients.find(p => p.id === currentPatientId);
    if (!patient) {
        modelSelectionSection.style.display = 'none';
        return;
    }
    
    // Filter models based on patient status
    availableModels = predictionModels.filter(model => {
        if (model.info.type === "init") {
            // Initial models require only initial data
            return true;
        } else if (model.info.type === "follow-up") {
            // Follow-up models require follow-up data
            // Check if patient has follow-up data
            const hasFollowupData = patient.treatment_type !== null || 
                                  patient.tsh_3 !== null ||
                                  patient.us3_thyroid_volume !== null;
            return hasFollowupData;
        }
        return false;
    });
    
    if (availableModels.length === 0) {
        modelSelectionSection.style.display = 'none';
        return;
    }
    
    // Clear previous options
    modelOptions.innerHTML = '';
    
    // Create radio buttons for each model
    availableModels.forEach((model, index) => {
        const modelId = `model-${index}`;
        const modelOption = document.createElement('div');
        modelOption.className = 'model-option';
        
        // Check if model should be disabled
        const isDisabled = model.info.type === "follow-up" && 
                          !(patient.treatment_type !== null || 
                            patient.tsh_3 !== null ||
                            patient.us3_thyroid_volume !== null);

        // Check if this model should be selected by default
        const isSelected = () => {
            return selectedModel === model.name;
        };
        
        modelOption.innerHTML = `
            <input type="radio" 
                    id="${modelId}" 
                    name="predictionModel" 
                    value="${model.name}" 
                    class="model-radio" 
                    ${isSelected() ? 'checked' : ''}
                    ${isDisabled ? 'disabled' : ''}>
            <label for="${modelId}" class="model-label ${isDisabled ? 'model-disabled' : ''}">
                <div class="model-name">${model.info.display_name.replace(/_/g, ' ').toUpperCase()}</div>
                <div class="model-type ${model.info.type === 'init' ? 'init' : 'follow-up'}">${model.info.type.toUpperCase()} МОДЕЛЬ</div>
                <div style="font-size: 0.85rem; margin-top: 5px; color: #666;">
                    ${model.info.type === "init" ? "Требуются только первичные данные" : "Требуются данные наблюдения"}
                </div>
                <div style="font-size: 0.85rem; margin-top: 5px; color: #666;">
                    ${model.info.description}
                </div>
            </label>
        `;
        
        modelOptions.appendChild(modelOption);
        
        // Add event listener
        const radioInput = document.getElementById(modelId);
        radioInput.addEventListener('change', function() {
            if (this.checked && !isDisabled) {
                selectedModel = model.name;
                console.log('Selected model:', selectedModel);
            }
        });
        
        // Set default selection
        if (isSelected() && !isDisabled) {
            selectedModel = model.name;
        }
    });
    
    modelSelectionSection.style.display = 'block';
}

// Test API endpoint
async function testAPI() {
    try {
        serverStatus.innerHTML = '<div class="spinner"></div> Тестирование API...';
        
        // Test multiple endpoints
        const modelsResponse = await fetch(MODELS_ENDPOINT);
        const patientsResponse = await fetch(PATIENTS_ENDPOINT);
        
        if (modelsResponse.ok && patientsResponse.ok) {
            showMessage('Тест API успешен: все конечные точки работают', 'success');
            serverStatus.innerHTML = '<span style="color: green;">✅ Серверная часть: Работает</span>';
            
            // Reload data after successful test
            await loadPredictionModels();
            await loadPatientsFromBackend();
            
        } else {
            showMessage('Тест API не удался: некоторые конечные точки не отвечают', 'error');
            serverStatus.innerHTML = '<span style="color: red;">❌ Серверная часть: Подключение не удалось</span>';
        }
        
    } catch (error) {
        showMessage(`Тест API не удался: ${error.message}`, 'error');
        serverStatus.innerHTML = '<span style="color: red;">❌ Серверная часть: Подключение не удалось</span>';
    }
}

// Render patient list
function renderPatientList() {
    patientList.innerHTML = '';
    
    if (patients.length === 0) {
        patientList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <p>Пациенты не найдены</p>
            </div>
        `;
        return;
    }
    
    patients.forEach(patient => {
        const patientItem = document.createElement('div');
        patientItem.className = `patient-item ${currentPatientId === patient.id ? 'active' : ''}`;
        patientItem.dataset.id = patient.id;
        
        // Determine patient status
        const hasFollowupData = patient.treatment_type !== null || 
                                patient.tsh_3 !== null ||
                                patient.us3_thyroid_volume !== null;
        
        let statusText = hasFollowupData ? 'Есть данные наблюдения' : 'Только первичный визит';
        let statusClass = hasFollowupData ? 'status-followup' : 'status-new';
        
        // Extract name from patient data
        const patientName = patient.patient_name || patient.name || `Пациент ${patient.id}`;
        const ageOnset = patient.age_onset || 'Неизвестно';
        
        patientItem.innerHTML = `
            <div class="patient-id">${patientName}</div>
            <div class="patient-age">Возраст начала заболевания: ${ageOnset}</div>
            <div class="${statusClass}" style="margin-top: 5px; font-size: 0.8rem;">${statusText}</div>
            <div class="patient-actions">
                <button class="btn btn-small btn-danger delete-patient-btn" data-id="${patient.id}">
                    <i class="fas fa-trash"></i> Удалить
                </button>
            </div>
        `;
        
        patientList.appendChild(patientItem);
    });
    
    // Add click event listeners to patient items
    document.querySelectorAll('.patient-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // Don't trigger selection if clicking on delete buttons
            if (e.target.closest('.delete-patient-btn')) {
                return;
            }
            selectPatient(item.dataset.id);
        });
    });
    
    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-patient-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const patientId = btn.dataset.id;
            if (confirm('Вы уверены, что хотите удалить этого пациента?')) {
                await deletePatient(patientId);
            }
        });
    });
}

// Select a patient
function selectPatient(patientId) {
    currentPatientId = patientId;
    isNewPatient = false;
    
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    
    // Update patient header
    const displayName = patient.patient_name || patient.name || `Пациент ${patient.id}`;
    patientName.textContent = displayName;
    
    // Determine status
    const hasFollowupData = patient.treatment_type !== null || 
                            patient.tsh_3 !== null ||
                            patient.us3_thyroid_volume !== null;
    
    if (hasFollowupData) {
        patientStatus.textContent = 'Есть данные наблюдения';
        patientStatus.className = 'patient-status status-followup';
        patientActions.style.display = 'none';
    } else {
        patientStatus.textContent = 'Только первичный визит';
        patientStatus.className = 'patient-status status-new';
        patientActions.style.display = 'block';
    }
    
    // Show delete button
    deletePatientBtn.style.display = 'inline-flex';
    
    // Populate initial form
    populateForm(initialForm, patient);
    
    // Update model selection based on patient status
    renderModelSelection();
    
    // Update patient list UI
    renderPatientList();
    
    // Clear results tab
    document.getElementById('calculationResults').innerHTML = `
        <div class="empty-state">
            <i class="fas fa-calculator"></i>
            <h3>Расчёт ещё не выполнен</h3>
            <p>Заполните данные пациента и нажмите "Рассчитать риск рецидива" для просмотра результатов.</p>
        </div>
    `;
    
    viewRawDataBtn.style.display = 'none';
}

// Populate form with patient data
function populateForm(form, patient) {
    const formElements = form.elements;
    
    for (let element of formElements) {
        if (element.name && patient[element.name] !== undefined && patient[element.name] !== null) {
            if (element.type === 'checkbox' && element.name.endsWith('_unknown')) {
                // Handle unknown checkboxes - if value is null, check the unknown box
                const fieldName = element.name.replace('_unknown', '');
                const isUnknown = patient[fieldName] === null || patient[fieldName] === undefined;
                element.checked = isUnknown;
                
                // Trigger change event to update field state
                setTimeout(() => element.dispatchEvent(new Event('change')), 0);
            } else if (element.type !== 'checkbox') {
                element.value = patient[element.name];
            }
        }
    }
}

// Switch between tabs
function switchTab(tabName) {
    // Update tab UI
    tabs.forEach(tab => {
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Update tab content
    tabContents.forEach(content => {
        if (content.id === `${tabName}-tab`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
    
    // When switching to results tab, update model selection
    if (tabName === 'results') {
        renderModelSelection();
    }
}

// Create a new patient
async function createNewPatient() {
    const newPatient = {
        patient_name: '',
        age_onset: null,
        sex: null,
        heredity: null,
        smoking_status: null,
        us1_thyroid_volume: null,
        us1_nodules: null,
        us1_nodules_cm: null,
        tsh_1: null,
        ft4_1: null,
        ft3_1: null,
        ft3_to_ft4_ratio: null,
        exophthalmos: null,
        thyrotoxic_cardiomyopathy: null,
        treatment_type: null,
        tsh_3: null,
        us3_thyroid_volume: null,
        us3_nodules: null,
        us3_nodules_cm: null
    };
    
    try {
        const result = await savePatientToBackend(newPatient, true);
        if (result && result.patient_id) {
            // Add to local state
            newPatient.id = result.patient_id;
            newPatient.created_at = new Date().toISOString();
            newPatient.updated_at = new Date().toISOString();
            patients.unshift(newPatient); // Add to beginning
            
            // Select the new patient
            currentPatientId = newPatient.id;
            isNewPatient = true;
            
            // Update UI
            patientName.textContent = 'Новый пациент';
            patientStatus.textContent = 'Первичный визит (новый)';
            patientStatus.className = 'patient-status status-new';
            patientActions.style.display = 'none';
            deletePatientBtn.style.display = 'inline-flex';
            
            // Clear forms
            initialForm.reset();
            readmissionForm.reset();
            
            // Switch to initial tab
            switchTab('initial');
            
            // Update model selection
            renderModelSelection();
            
            // Render updated patient list
            renderPatientList();
            
            // Focus on first field
            document.getElementById('patient_name').focus();
            
            // Initialize unknown checkboxes for new form
            initializeUnknownCheckboxes();
            
            showMessage('Новый пациент создан. Пожалуйста, заполните первичные данные.', 'success');
        }
    } catch (error) {
        showMessage(`Ошибка при создании пациента: ${error.message}`, 'error');
    }
}

// Save initial patient data
async function saveInitialData() {
    if (!currentPatientId) {
        showMessage('Пожалуйста, сначала создайте или выберите пациента', 'error');
        return;
    }
    
    const patientIndex = patients.findIndex(p => p.id === currentPatientId);
    if (patientIndex === -1) return;
    
    const formData = getFormData(initialForm);
    const patient = patients[patientIndex];
    
    // Update patient data from form
    Object.keys(formData).forEach(key => {
        if (key.endsWith('_unknown')) {
            // This is handled in getFormData
        } else {
            // Convert empty strings to null for consistency with backend
            patient[key] = formData[key] === '' ? null : formData[key];
        }
    });
    
    // Ensure we have required fields
    if (!patient.patient_name) {
        showMessage('Имя пациента обязательно', 'error');
        return;
    }
    
    if (!patient.age_onset) {
        showMessage('Возраст при начале заболевания обязателен', 'error');
        return;
    }
    
    if (patient.sex === null || patient.sex === undefined) {
        showMessage('Пол обязателен', 'error');
        return;
    }
    
    // Prepare data for backend
    const patientData = {
        // redundancy
        id: patient.id,
        patient_data: {
            patient_name: patient.patient_name,
            age_onset: patient.age_onset,
            sex: patient.sex,
            heredity: patient.heredity,
            smoking_status: patient.smoking_status,
            us1_thyroid_volume: patient.us1_thyroid_volume,
            us1_nodules: patient.us1_nodules,
            us1_nodules_cm: patient.us1_nodules_cm,
            tsh_1: patient.tsh_1,
            ft4_1: patient.ft4_1,
            ft3_1: patient.ft3_1,
            ft3_to_ft4_ratio: patient.ft3_to_ft4_ratio,
            exophthalmos: patient.exophthalmos,
            thyrotoxic_cardiomyopathy: patient.thyrotoxic_cardiomyopathy,
            treatment_type: patient.treatment_type,
            tsh_3: patient.tsh_3,
            us3_thyroid_volume: patient.us3_thyroid_volume,
            us3_nodules: patient.us3_nodules,
            us3_nodules_cm: patient.us3_nodules_cm
        }
    };
    
    try {
        const result = await savePatientToBackend(patientData, false);
        if (result) {
            // Update local state
            patient.updated_at = new Date().toISOString();
            isNewPatient = false;
            
            // Update model selection
            renderModelSelection();
            
            // Show success message
            showMessage('Данные пациента успешно сохранены!', 'success');
            
            // Update UI
            renderPatientList();
            selectPatient(patient.id); // Refresh the view
        }
    } catch (error) {
        showMessage(`Ошибка при сохранении пациента: ${error.message}`, 'error');
    }
}

// Save follow-up data
async function saveReadmissionData() {
    if (!currentPatientId) {
        showMessage('Пожалуйста, сначала выберите пациента', 'error');
        return;
    }
    
    const patientIndex = patients.findIndex(p => p.id === currentPatientId);
    if (patientIndex === -1) return;
    
    const formData = getFormData(readmissionForm);
    const patient = patients[patientIndex];
    
    // Update patient data from form
    Object.keys(formData).forEach(key => {
        if (key.endsWith('_unknown')) {
            // This is handled in getFormData
        } else {
            // Convert empty strings to null for consistency with backend
            patient[key] = formData[key] === '' ? null : formData[key];
        }
    });
    
    // Prepare data for backend
    const patientData = {
        id: patient.id,
        patient_data: {
            patient_name: patient.patient_name,
            age_onset: patient.age_onset,
            sex: patient.sex,
            heredity: patient.heredity,
            smoking_status: patient.smoking_status,
            us1_thyroid_volume: patient.us1_thyroid_volume,
            us1_nodules: patient.us1_nodules,
            us1_nodules_cm: patient.us1_nodules_cm,
            tsh_1: patient.tsh_1,
            ft4_1: patient.ft4_1,
            ft3_1: patient.ft3_1,
            ft3_to_ft4_ratio: patient.ft3_to_ft4_ratio,
            exophthalmos: patient.exophthalmos,
            thyrotoxic_cardiomyopathy: patient.thyrotoxic_cardiomyopathy,
            treatment_type: patient.treatment_type,
            tsh_3: patient.tsh_3,
            us3_thyroid_volume: patient.us3_thyroid_volume,
            us3_nodules: patient.us3_nodules,
            us3_nodules_cm: patient.us3_nodules_cm
        }
    };
    
    try {
        const result = await savePatientToBackend(patientData, false);
        if (result) {
            // Update patient status
            patient.updated_at = new Date().toISOString();
            
            // Enable follow-up tab
            document.querySelector('.tab[data-tab="readmission"]').classList.add('active');
            
            // Hide add follow-up button
            patientActions.style.display = 'none';
            
            // Update model selection (now follow-up models should be available)
            renderModelSelection();
            
            // Show success message
            showMessage('Данные наблюдения успешно сохранены!', 'success');
            
            // Update UI
            renderPatientList();
            selectPatient(patient.id); // Refresh the view
            switchTab('readmission');
        }
    } catch (error) {
        showMessage(`Ошибка при сохранении данных наблюдения: ${error.message}`, 'error');
    }
}

// Delete a patient
async function deletePatient(patientId) {
    try {
        const result = await deletePatientFromBackend(patientId);
        if (result) {
            // Remove from local state
            patients = patients.filter(p => p.id !== patientId);
            
            // If we deleted the current patient, clear the form
            if (currentPatientId === patientId) {
                currentPatientId = null;
                patientName.textContent = 'Выберите пациента или добавьте нового';
                patientStatus.textContent = 'Пациент не выбран';
                patientStatus.className = 'patient-status';
                patientActions.style.display = 'none';
                deletePatientBtn.style.display = 'none';
                initialForm.reset();
                readmissionForm.reset();
                modelSelectionSection.style.display = 'none';
            }
            
            // Update UI
            renderPatientList();
            
            showMessage('Пациент успешно удалён', 'success');
        }
    } catch (error) {
        showMessage(`Ошибка при удалении пациента: ${error.message}`, 'error');
    }
}

// Calculate recurrence risk using ML backend
async function calculateRecurrenceRisk() {
    if (!currentPatientId) {
        showMessage('Пожалуйста, сначала выберите пациента', 'error');
        return;
    }
    
    const patient = patients.find(p => p.id === currentPatientId);
    if (!patient) return;
    
    // Check if we have required data (age_onset and sex cannot be null)
    const requiredFields = ['age_onset', 'sex'];
    const missingFields = requiredFields.filter(field => 
        patient[field] === null || patient[field] === undefined || patient[field] === ''
    );
    
    if (missingFields.length > 0) {
        showMessage(`Отсутствуют необходимые данные: ${missingFields.join(', ')}`, 'error');
        return;
    }
    
    // Check if model is selected
    if (!selectedModel) {
        showMessage('Пожалуйста, сначала выберите модель прогнозирования', 'error');
        return;
    }
    
    // Prepare data for API
    const apiData = {};
    
    // Map patient data to API expected format
    const fieldMapping = {
        'age_onset': 'age_onset',
        'heredity': 'heredity',
        'smoking_status': 'smoking_status',
        'sex': 'sex',
        'us1_thyroid_volume': 'us1_thyroid_volume',
        'us1_nodules': 'us1_nodules',
        'us1_nodules_cm': 'us1_nodules_cm',
        'tsh_1': 'tsh_1',
        'ft4_1': 'ft4_1',
        'ft3_1': 'ft3_1',
        'ft3_to_ft4_ratio': 'ft3_to_ft4_ratio',
        'exophthalmos': 'exophthalmos',
        'thyrotoxic_cardiomyopathy': 'thyrotoxic_cardiomyopathy',
        'treatment_type': 'treatment_type',
        'tsh_3': 'tsh_3',
        'us3_thyroid_volume': 'us3_thyroid_volume',
        'us3_nodules': 'us3_nodules',
        'us3_nodules_cm': 'us3_nodules_cm'
    };
    
    Object.keys(fieldMapping).forEach(patientField => {
        let value = patient[patientField];
        
        // Convert null/undefined to -1 (as expected by backend)
        if (typeof value === 'string') {
            // Try to parse numeric strings
            const num = parseFloat(value);
            value = isNaN(num) ? value : num;
        }
        
        apiData[fieldMapping[patientField]] = value;
    });
    
    // Add selected model to API request
    apiData.model_name = selectedModel;
    
    console.log('Sending data to API:', apiData);
    
    // Show loading state
    const resultsDiv = document.getElementById('calculationResults');
    resultsDiv.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div class="spinner"></div>
            <p style="margin-top: 10px;">Расчёт риска рецидива с помощью ${availableModels.find(el => el.name === selectedModel)?.info.display_name}...</p>
        </div>
    `;
    
    try {
        const response = await fetch(PREDICT_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(apiData)
        });
        
        const tempText = await response.text();
        const validJson = tempText
            .replace(/NaN/g, 'null');
        const result = JSON.parse(validJson);
        
        if (result.status === 'success') {
            const prediction = result.prediction;
            const probability = (result.probability * 100).toFixed(1);
            
            // Check if feature contributions exist in the response
            const featureContributions = result.feature_contributions;
            let featureRowsHTML = '';

            // Add feature rows
            const featureNames = {
                'age_onset': 'Возраст при начале',
                'heredity': 'Наследственная предрасположенность',
                'smoking_status': 'Курение',
                'sex': 'Пол',
                'us1_thyroid_volume': 'Объём щитовидной железы US1',
                'us1_nodules': 'Узлы US1',
                'us1_nodules_cm': 'Размер узлов US1',
                'tsh_1': 'Уровень ТТГ 1',
                'ft4_1': 'Уровень FT4 1',
                'ft3_1': 'Уровень FT3 1',
                'ft3_to_ft4_ratio': 'Соотношение FT3/FT4',
                'exophthalmos': 'Экзофтальм',
                'thyrotoxic_cardiomyopathy': 'Тиреотоксическая кардиомиопатия',
                'treatment_type': 'Тип лечения',
                'tsh_3': 'Уровень ТТГ 3',
                'us3_thyroid_volume': 'Объём щитовидной железы US3',
                'us3_nodules': 'Узлы US3',
                'us3_nodules_cm': 'Размер узлов US3'
            };
            
            Object.keys(apiData).forEach(key => {
                // Skip model_name in the feature table
                if (key === 'model_name') return;
                
                const value = apiData[key];
                let displayValue;
                let status;
                let statusColor;
                let importanceDisplay = 'Н/Д';
                let importanceColor = '#666';
                
                if (value === null || value === -1) {
                    displayValue = '<em style="color: #666;">Неизвестно</em>';
                    status = 'Неизвестно';
                    statusColor = '#666';
                } else {
                    displayValue = value;
                    status = 'Указано';
                    statusColor = '#388e3c';
                    
                    // Special formatting for some fields
                    if (key === 'sex') {
                        displayValue = value === 1 ? 'Мужской' : 'Женский';
                    } else if (key === 'heredity' || key === 'smoking_status' || key === 'us1_nodules' || key === 'us3_nodules' || 
                              key === 'exophthalmos' || key === 'thyrotoxic_cardiomyopathy') {
                        displayValue = value === 1 ? 'Да' : 'Нет';
                    } else if (key === 'treatment_type') {
                        displayValue = `Тип ${value}`;
                    }
                }
                
                // Check if we have feature importance data
                if (featureContributions && featureContributions[key]) {
                    const scaledImportance = featureContributions[key].scaled_importance;
                    const shapEffect = featureContributions[key].shap_effect;
                    
                    // Format the importance as percentage
                    const importancePercent = (scaledImportance * 100).toFixed(2);
                    
                    // Determine color based on importance magnitude
                    if (scaledImportance > 0.05) {
                        importanceColor = '#d32f2f'; // Красный для высокой важности
                    } else if (scaledImportance > 0.01) {
                        importanceColor = '#f57c00'; // Оранжевый для средней важности
                    } else {
                        importanceColor = '#388e3c'; // Зелёный для низкой важности
                    }
                    
                    // Create tooltip with SHAP effect information
                    const tooltip = `Эффект SHAP: ${shapEffect.toFixed(4)}`;
                    importanceDisplay = `
                        <span title="${tooltip}" style="cursor: help; color: ${importanceColor}; font-weight: bold;">
                            ${importancePercent}%
                        </span>
                    `;
                }

                featureRowsHTML += `
                    <tr>
                        <td style="padding: 6px;">${featureNames[key] || key}</td>
                        <td style="padding: 6px; text-align: center;">${displayValue}</td>
                        <td style="padding: 6px; text-align: center; color: ${statusColor}">
                            ${status}
                        </td>
                        <td style="padding: 6px; text-align: center;">
                            ${importanceDisplay}
                        </td>
                    </tr>
                `;
            });
            
            // Store the raw data for viewing
            window.lastPredictionData = {
                apiData: apiData,
                result: result
            };
            
            // Show view raw data button
            viewRawDataBtn.style.display = 'inline-flex';
            viewRawDataBtn.onclick = () => {
                alert(JSON.stringify(window.lastPredictionData, null, 2));
            };

            // Add importance summary section
            let importanceSummaryHTML = '';
            if (featureContributions) {
                // Find top 3 most important features
                const sortedFeatures = Object.keys(featureContributions)
                    .map(key => ({
                        name: featureNames[key] || key,
                        importance: featureContributions[key].scaled_importance,
                        shap: featureContributions[key].shap_effect
                    }))
                    .sort((a, b) => b.importance - a.importance)
                    .slice(0, 3);
                
                if (sortedFeatures.length > 0) {
                    importanceSummaryHTML = `
                        <div style="margin-top: 20px; padding: 15px; background-color: #f0f7ff; border-radius: 5px; border-left: 4px solid #3498db;">
                            <h5><i class="fas fa-chart-bar"></i> Ключевые факторы, влияющие на прогноз:</h5>
                            <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                                ${sortedFeatures.map(feature => `
                                    <li><strong>${feature.name}:</strong> ${(feature.importance * 100).toFixed(2)}% влияние</li>
                                `).join('')}
                            </ul>
                        </div>
                    `;
                }
            }

            // Display results
            resultsDiv.innerHTML = `
                <div style="background-color: ${prediction == 1 ? '#ffebee' : '#e8f5e9'}; 
                            padding: 20px; border-radius: 5px; margin: 15px 0;">
                    <div style="font-size: 24px; font-weight: bold; 
                                color: ${prediction == 1 ? '#d32f2f' : '#388e3c'}; margin-bottom: 10px;">
                        ${prediction == 1 ? 'ВЫСОКИЙ РИСК РЕЦИДИВА ⚠️' : 'НИЗКИЙ РИСК РЕЦИДИВА ✅'}
                    </div>
                    <div style="font-size: 18px; margin-bottom: 10px;">
                        <strong>Вероятность:</strong> ${probability}%
                    </div>
                    <div><strong>Использованная модель:</strong> ${availableModels.find(el => el.name === selectedModel)?.info.display_name}</div>
                </div>
                
                ${importanceSummaryHTML}
                
                <h4>Сводка:</h4>
                <div style="max-height: 300px; overflow-y: auto; margin-top: 10px;">
                    <table border="1" style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                        <thead>
                            <tr>
                                <th style="padding: 8px; background-color: #f2f2f2;">Признак</th>
                                <th style="padding: 8px; background-color: #f2f2f2; text-align: center;">Значение</th>
                                <th style="padding: 8px; background-color: #f2f2f2; text-align: center;">Статус</th>
                                <th style="padding: 8px; background-color: #f2f2f2; text-align: center;">Относительная важность</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${featureRowsHTML}
                        </tbody>
                    </table>
                </div>
                <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
                    <p style="font-size: 0.9rem; margin-top: 5px;">
                        <strong>Важность признаков:</strong> Показывает, насколько каждый признак повлиял на прогноз.
                        Более высокие проценты указывают на большее влияние на решение модели.
                        Наведите курсор на проценты, чтобы увидеть значения эффекта SHAP.
                    </p>
                </div>
            `;
        } else {
            resultsDiv.innerHTML = `
                <div style="color: red; padding: 20px; text-align: center;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h4>Ошибка в прогнозировании</h4>
                    <p>${result.message || 'Произошла неизвестная ошибка'}</p>
                </div>
            `;
        }
        
    } catch (error) {
        resultsDiv.innerHTML = `
            <div style="color: red; padding: 20px; text-align: center;">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Сетевая ошибка</h4>
                <p>${error.message}</p>
                <p style="font-size: 0.9rem; margin-top: 10px;">
                    Пожалуйста, проверьте, запущен ли сервер ML backend.
                </p>
            </div>
        `;
    }
    
    // Switch to results tab
    switchTab('results');
}

// Get form data with proper null handling
function getFormData(form) {
    const formData = {};
    const formElements = form.elements;
    
    for (let element of formElements) {
        if (element.name) {
            if (element.type === 'checkbox' && element.name.endsWith('_unknown')) {
                const fieldName = element.name.replace('_unknown', '');
                formData[element.name] = element.checked;
                
                // If unknown is checked, set the actual field to null
                if (element.checked) {
                    formData[fieldName] = null;
                }
            } else if (element.type !== 'checkbox') {
                // For select elements, empty string means not selected
                if (element.type === 'select-one' && element.value === '') {
                    // For required fields, don't set null
                    if (element.name !== 'age_onset' && element.name !== 'sex' && element.name !== 'patient_name') {
                        formData[element.name] = null;
                    }
                } else if (element.value === '') {
                    // For other fields, empty string becomes null
                    if (element.name !== 'age_onset' && element.name !== 'sex' && element.name !== 'patient_name') {
                        formData[element.name] = null;
                    } else {
                        formData[element.name] = '';
                    }
                } else {
                    formData[element.name] = element.value;
                }
            }
        }
    }
    
    return formData;
}

// Auto-calculation for FT3/FT4 ratio
function updateRatio() {
    const ft3Input = document.getElementById('ft3_1');
    const ft4Input = document.getElementById('ft4_1');
    const ratioInput = document.getElementById('ft3_to_ft4_ratio');
    const ft3Unknown = document.getElementById('ft3_1_unknown');
    const ft4Unknown = document.getElementById('ft4_1_unknown');
    
    // Only calculate if both inputs are enabled (not marked as unknown)
    if (!ft3Input.disabled && !ft4Input.disabled) {
        const ft3 = parseFloat(ft3Input.value) || 0;
        const ft4 = parseFloat(ft4Input.value) || 1;
        
        if (ft4 > 0) {
            const ratio = (ft3 / ft4).toFixed(2);
            ratioInput.value = ratio;
            
            // Mark ratio as known if both inputs have values
            if (ft3Input.value && ft4Input.value) {
                const ratioUnknown = document.getElementById('ft3_to_ft4_ratio_unknown');
                if (ratioUnknown && ratioUnknown.checked) {
                    ratioUnknown.checked = false;
                    ratioUnknown.dispatchEvent(new Event('change'));
                }
            }
        }
    }
}

// Initialize unknown checkboxes
function initializeUnknownCheckboxes() {
    const unknownCheckboxes = document.querySelectorAll('input[type="checkbox"][name$="_unknown"]');
    unknownCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const fieldName = this.name.replace('_unknown', '');
            const field = document.querySelector(`[name="${fieldName}"]`);
            
            if (this.checked) {
                // Mark field as unknown
                if (field) {
                    field.value = '';
                    field.disabled = true;
                    field.style.backgroundColor = '#f5f5f5';
                    field.style.color = '#999';
                }
            } else {
                // Field is known, enable it
                if (field) {
                    field.disabled = false;
                    field.style.backgroundColor = '';
                    field.style.color = '';
                    if (field.type !== 'select-one') {
                        field.focus();
                    }
                }
            }
        });
        
        // Trigger initial state
        setTimeout(() => checkbox.dispatchEvent(new Event('change')), 0);
    });
}

// Show message to user
function showMessage(message, type) {
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.textContent = message;
    messageEl.className = `toast ${type}`;
    
    // Add to document
    document.body.appendChild(messageEl);
    
    // Remove after 3 seconds
    setTimeout(() => {
        messageEl.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (messageEl.parentNode) {
                document.body.removeChild(messageEl);
            }
        }, 300);
    }, 3000);
}

// Setup event listeners
function setupEventListeners() {
    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            if (tab.classList.contains('active')) return;
            switchTab(tab.dataset.tab);
        });
    });
    
    // Add patient button
    addPatientBtn.addEventListener('click', createNewPatient);
    
    // Add follow-up button
    addReadmissionBtn.addEventListener('click', () => {
        switchTab('readmission');
    });
    
    // Save initial data button
    saveInitialBtn.addEventListener('click', saveInitialData);
    
    // Save follow-up data button
    saveReadmissionBtn.addEventListener('click', saveReadmissionData);
    
    // Calculate risk button
    calculateRiskBtn.addEventListener('click', calculateRecurrenceRisk);
    
    // Delete patient button
    deletePatientBtn.addEventListener('click', async () => {
        if (currentPatientId && confirm('Вы уверены, что хотите удалить этого пациента?')) {
            await deletePatient(currentPatientId);
        }
    });
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

