document.addEventListener('DOMContentLoaded', function() {
    // Form section collapse/expand functionality
    const sectionTitles = document.querySelectorAll('.section-title');
    sectionTitles.forEach(title => {
        title.addEventListener('click', function() {
            const sectionId = this.getAttribute('data-section');
            const sectionContent = document.getElementById(sectionId + 'Section');
            const icon = this.querySelector('i.fa-chevron-down');
            
            if (sectionContent.classList.contains('form-collapsed')) {
                sectionContent.classList.remove('form-collapsed');
                icon.style.transform = 'rotate(0deg)';
            } else {
                sectionContent.classList.add('form-collapsed');
                icon.style.transform = 'rotate(-90deg)';
            }
        });
    });
    
    // Patient selection functionality
    const patientSelect = document.getElementById('patientSelect');
    const patientItems = document.querySelectorAll('.patient-item');
    
    patientSelect.addEventListener('change', function() {
        const selectedPatientId = this.value;
        
        if (selectedPatientId === 'new') {
            clearForm();
            setFormTitle('New Patient');
            // Remove active class from all patient items
            patientItems.forEach(item => {
                item.classList.remove('active');
            });
            // Clear appointments
            clearAppointments();
        } else {
            loadPatientData(selectedPatientId);
            // Set active patient in the list
            patientItems.forEach(item => {
                if (item.getAttribute('data-id') === selectedPatientId) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
            // Load appointments for this patient
            loadAppointments(selectedPatientId);
        }
    });
    
    // Patient item click functionality
    patientItems.forEach(item => {
        item.addEventListener('click', function() {
            const patientId = this.getAttribute('data-id');
            
            // Update the select dropdown
            patientSelect.value = patientId;
            
            // Update active state
            patientItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            
            // Load patient data
            loadPatientData(patientId);
            // Load appointments for this patient
            loadAppointments(patientId);
        });
    });
    
    // Clear form button
    document.getElementById('clearFormBtn').addEventListener('click', function() {
        clearForm();
        patientSelect.value = 'new';
        patientItems.forEach(item => item.classList.remove('active'));
        setFormTitle('New Patient');
        clearAppointments();
    });
    
    // Form submission
    document.getElementById('patientForm').addEventListener('submit', function(e) {
        e.preventDefault();
        savePatientData();
    });
    
    // Calculate risk button
    document.getElementById('calculateBtn').addEventListener('click', function() {
        calculateRisk();
    });
    
    // Add new appointment button
    document.getElementById('addAppointmentBtn').addEventListener('click', function() {
        addNewAppointment();
    });
    
    // Unknown checkbox functionality for permanent fields
    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('unknown-input')) {
            const checkbox = e.target;
            const fieldId = checkbox.id.replace('_unknown', '');
            const formGroup = checkbox.closest('.form-group');
            
            if (checkbox.checked) {
                formGroup.classList.add('disabled');
                // Clear the field value
                const input = formGroup.querySelector('input:not(.unknown-input), select, textarea');
                if (input) {
                    input.disabled = true;
                    // For radio buttons, uncheck all
                    if (input.type === 'radio') {
                        formGroup.querySelectorAll('input[type="radio"]').forEach(radio => {
                            radio.checked = false;
                        });
                    } else {
                        input.value = '';
                    }
                }
            } else {
                formGroup.classList.remove('disabled');
                // Enable the field
                const input = formGroup.querySelector('input:not(.unknown-input), select, textarea');
                if (input) {
                    input.disabled = false;
                }
            }
        }
    });
    
    // Function to set form title
    function setFormTitle(title) {
        document.querySelector('.content h2').innerHTML = `<i class="fas fa-edit"></i> ${title}`;
    }
    
    // Function to load patient data
    function loadPatientData(patientId) {
        // In a real application, this would fetch data from a server
        // For this demo, we'll just simulate with different data based on patientId
        
        let patientData = {};
        
        switch(patientId) {
            case 'patient1':
                patientData = {
                    date_of_birth: '1981-05-15',
                    heredity: '0',
                    sex: '0',
                    us1_thyroid_volume: 25.5,
                    us1_nodules: '0',
                    us1_nodules_cm: 0,
                    tsh_1: 0.05,
                    ft4_1: 32.5,
                    ft3_1: 12.8,
                    ft3_to_ft4_ratio: 0.39,
                    exophthalmos: '1',
                    thyrotoxic_cardiomyopathy: '0',
                    treatment_type: '1',
                    tsh_3: 1.8,
                    us3_thyroid_volume: 18.2,
                    us3_nodules: '0',
                    us3_nodules_cm: 0,
                    recurrence: '0'
                };
                setFormTitle('Patient #001 - Maria Ivanova');
                break;
                
            case 'patient2':
                patientData = {
                    date_of_birth: '1967-03-22',
                    heredity: '1',
                    sex: '1',
                    us1_thyroid_volume: 42.3,
                    us1_nodules: '1',
                    us1_nodules_cm: 2.5,
                    tsh_1: 0.02,
                    ft4_1: 45.2,
                    ft3_1: 18.7,
                    ft3_to_ft4_ratio: 0.41,
                    exophthalmos: '0',
                    thyrotoxic_cardiomyopathy: '1',
                    treatment_type: '2',
                    tsh_3: 0.8,
                    us3_thyroid_volume: 35.1,
                    us3_nodules: '1',
                    us3_nodules_cm: 1.8,
                    recurrence: '1'
                };
                setFormTitle('Patient #002 - Dmitry Sokolov');
                break;
                
            case 'patient3':
                patientData = {
                    date_of_birth: '1985-11-08',
                    heredity: '1',
                    sex: '0',
                    us1_thyroid_volume: 18.7,
                    us1_nodules: '0',
                    us1_nodules_cm: 0,
                    tsh_1: 8.5,
                    ft4_1: 12.3,
                    ft3_1: 4.2,
                    ft3_to_ft4_ratio: 0.34,
                    exophthalmos: '0',
                    thyrotoxic_cardiomyopathy: '0',
                    treatment_type: '0',
                    tsh_3: 3.2,
                    us3_thyroid_volume: 16.5,
                    us3_nodules: '0',
                    us3_nodules_cm: 0,
                    recurrence: '0'
                };
                setFormTitle('Patient #003 - Elena Petrova');
                break;
                
            default:
                // Default data with today's date 35 years ago
                const defaultBirthDate = new Date();
                defaultBirthDate.setFullYear(defaultBirthDate.getFullYear() - 35);
                const formattedDate = defaultBirthDate.toISOString().split('T')[0];
                
                patientData = {
                    date_of_birth: formattedDate,
                    heredity: '0',
                    sex: '0',
                    us1_thyroid_volume: 25.5,
                    us1_nodules: '0',
                    us1_nodules_cm: 0,
                    tsh_1: 0.05,
                    ft4_1: 32.5,
                    ft3_1: 12.8,
                    ft3_to_ft4_ratio: 0.39,
                    exophthalmos: '0',
                    thyrotoxic_cardiomyopathy: '0',
                    treatment_type: '1',
                    tsh_3: 1.8,
                    us3_thyroid_volume: 18.2,
                    us3_nodules: '0',
                    us3_nodules_cm: 0,
                    recurrence: '0'
                };
                setFormTitle('Patient Data Form');
        }
        
        // Populate form fields
        for (const [key, value] of Object.entries(patientData)) {
            const input = document.querySelector(`[name="${key}"]`);
            if (input) {
                if (input.type === 'radio') {
                    // For radio buttons, find the one with the correct value
                    const radioToCheck = document.querySelector(`[name="${key}"][value="${value}"]`);
                    if (radioToCheck) {
                        radioToCheck.checked = true;
                        // Reset unknown checkbox
                        const unknownCheckbox = document.getElementById(`${key}_unknown`);
                        if (unknownCheckbox) {
                            unknownCheckbox.checked = false;
                            const formGroup = unknownCheckbox.closest('.form-group');
                            formGroup.classList.remove('disabled');
                            input.disabled = false;
                        }
                    }
                } else {
                    input.value = value;
                    input.disabled = false;
                    // Reset unknown checkbox
                    const unknownCheckbox = document.getElementById(`${key}_unknown`);
                    if (unknownCheckbox) {
                        unknownCheckbox.checked = false;
                        const formGroup = unknownCheckbox.closest('.form-group');
                        formGroup.classList.remove('disabled');
                    }
                }
            }
        }
        
        // Show a notification
        showNotification(`Loaded data for ${patientId === 'patient1' ? 'Maria Ivanova' : patientId === 'patient2' ? 'Dmitry Sokolov' : patientId === 'patient3' ? 'Elena Petrova' : 'patient'}`);
    }
    
    // Function to save patient data
    function savePatientData() {
        // In a real application, this would send data to a server
        const formData = new FormData(document.getElementById('patientForm'));
        const data = Object.fromEntries(formData);
        
        // Also save appointment data
        const appointmentsData = getAppointmentsData();
        
        console.log('Saving patient data:', data);
        console.log('Saving appointments data:', appointmentsData);
        
        // Show success message
        showNotification('Patient data saved successfully!', 'success');
        
        // If this is a new patient, add to the list
        if (patientSelect.value === 'new') {
            // In a real app, you would get the new patient ID from the server
            const newPatientId = 'patient' + (document.querySelectorAll('.patient-item').length + 1);
            
            // Update the select dropdown
            const newOption = document.createElement('option');
            newOption.value = newPatientId;
            newOption.textContent = `#00${document.querySelectorAll('.patient-item').length + 1} - New Patient`;
            patientSelect.appendChild(newOption);
            patientSelect.value = newPatientId;
            
            // Add to patient list
            const patientList = document.querySelector('.patient-list');
            const newPatientItem = document.createElement('div');
            newPatientItem.className = 'patient-item';
            newPatientItem.setAttribute('data-id', newPatientId);
            
            // Calculate age from date of birth
            let ageDisplay = '';
            if (data.date_of_birth) {
                const dob = new Date(data.date_of_birth);
                const today = new Date();
                let age = today.getFullYear() - dob.getFullYear();
                const monthDiff = today.getMonth() - dob.getMonth();
                
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
                    age--;
                }
                ageDisplay = `Age: ${age}`;
            }
            
            newPatientItem.innerHTML = `
                <div>
                    <div class="patient-id">#00${document.querySelectorAll('.patient-item').length + 1} - New Patient</div>
                    <div class="patient-age">${ageDisplay} | Diagnosis: New case</div>
                </div>
                <div class="patient-risk risk-low">New</div>
            `;
            patientList.appendChild(newPatientItem);
            
            // Add click event to new patient item
            newPatientItem.addEventListener('click', function() {
                const patientId = this.getAttribute('data-id');
                patientSelect.value = patientId;
                document.querySelectorAll('.patient-item').forEach(i => i.classList.remove('active'));
                this.classList.add('active');
                loadPatientData(patientId);
            });
            
            // Set form title
            setFormTitle(`Patient #00${document.querySelectorAll('.patient-item').length} - New Patient`);
        }
    }
    
    // Function to calculate risk
    function calculateRisk() {
        // Get data from the latest appointment or use form data
        const appointments = document.querySelectorAll('.appointment-section');
        let ageOnset = 35;
        let smokingStatus = '0';
        
        if (appointments.length > 0) {
            // Use data from the most recent appointment
            const latestAppointment = appointments[appointments.length - 1];
            const ageInput = latestAppointment.querySelector('.appointment-age-onset');
            ageOnset = ageInput && ageInput.value ? parseInt(ageInput.value) : 35;
            
            // Get smoking status from the latest appointment
            const smokingRadio = latestAppointment.querySelector('input[name^="appointment_smoking_status"]:checked');
            smokingStatus = smokingRadio ? smokingRadio.value : '0';
        }
        
        // Get other form data
        const formData = new FormData(document.getElementById('patientForm'));
        const data = Object.fromEntries(formData);
        
        // Add appointment-specific data
        data.age_onset = ageOnset;
        data.smoking_status = smokingStatus;
        
        console.log('Calculating risk based on:', data);
        
        // Mock risk calculation based on form values
        let riskScore = 0;
        
        // Age at onset (higher age = higher risk)
        if (data.age_onset > 50) riskScore += 25;
        else if (data.age_onset > 40) riskScore += 15;
        else riskScore += 5;
        
        // Family history
        if (data.heredity === '1') riskScore += 20;
        
        // Smoking
        if (data.smoking_status === '2') riskScore += 25; // Current smoker
        else if (data.smoking_status === '3') riskScore += 15; // History
        
        // Male sex (higher risk for some thyroid conditions)
        if (data.sex === '1') riskScore += 10;
        
        // Large initial thyroid volume
        if (parseFloat(data.us1_thyroid_volume) > 30) riskScore += 15;
        
        // Initial nodules
        if (data.us1_nodules === '1') riskScore += 10;
        
        // Very low initial TSH
        if (parseFloat(data.tsh_1) < 0.1) riskScore += 10;
        
        // High initial FT4
        if (parseFloat(data.ft4_1) > 30) riskScore += 10;
        
        // Exophthalmos
        if (data.exophthalmos === '1') riskScore += 15;
        
        // Cardiomyopathy
        if (data.thyrotoxic_cardiomyopathy === '1') riskScore += 20;
        
        // TSH after treatment not normalized
        if (parseFloat(data.tsh_3) < 0.5 || parseFloat(data.tsh_3) > 4.5) riskScore += 15;
        
        // Nodules after treatment
        if (data.us3_nodules === '1') riskScore += 10;
        
        // Calculate risk percentage (normalize to 0-100)
        riskScore = Math.min(100, riskScore);
        
        // Determine risk level
        let riskLevel, riskClass, riskDescription, recommendation;
        
        if (riskScore < 30) {
            riskLevel = "Low Risk";
            riskClass = "low-risk";
            riskDescription = "Based on the patient data, there is a low risk of thyroid disease recurrence.";
            recommendation = "Continue standard follow-up annually";
        } else if (riskScore < 60) {
            riskLevel = "Medium Risk";
            riskClass = "medium-risk";
            riskDescription = "Based on the patient data, there is a moderate risk of thyroid disease recurrence.";
            recommendation = "Continue monitoring every 6 months";
        } else {
            riskLevel = "High Risk";
            riskClass = "high-risk";
            riskDescription = "Based on the patient data, there is a high risk of thyroid disease recurrence.";
            recommendation = "Consider additional treatment options and monitor every 3 months";
        }
        
        // Update result widget
        document.getElementById('riskLevel').textContent = riskLevel;
        document.getElementById('riskLevel').className = `risk-level ${riskClass}`;
        document.getElementById('riskDescription').textContent = riskDescription;
        document.getElementById('recurrenceProbability').textContent = `${riskScore}%`;
        
        // Determine key factors
        let keyFactors = [];
        if (data.heredity === '1') keyFactors.push("Family history");
        if (data.smoking_status === '2' || data.smoking_status === '3') keyFactors.push("Smoking history");
        if (parseFloat(data.tsh_1) < 0.1) keyFactors.push("Very low initial TSH");
        if (data.exophthalmos === '1') keyFactors.push("Exophthalmos");
        if (data.thyrotoxic_cardiomyopathy === '1') keyFactors.push("Cardiomyopathy");
        if (keyFactors.length === 0) keyFactors = ["None identified"];
        
        document.getElementById('keyFactors').textContent = keyFactors.join(", ");
        document.getElementById('recommendation').textContent = recommendation;
        
        // Show the result widget
        document.getElementById('resultWidget').style.display = 'block';
        
        // Show notification
        showNotification('Risk assessment completed!', 'success');
        
        // Scroll to result widget
        document.getElementById('resultWidget').scrollIntoView({ behavior: 'smooth' });
    }
    
    // Function to clear the form
    function clearForm() {
        document.getElementById('patientForm').reset();
        // Reset all unknown checkboxes
        document.querySelectorAll('.unknown-input').forEach(checkbox => {
            checkbox.checked = false;
            const formGroup = checkbox.closest('.form-group');
            formGroup.classList.remove('disabled');
            const input = formGroup.querySelector('input:not(.unknown-input), select, textarea');
            if (input) input.disabled = false;
        });
        showNotification('Form cleared. Ready for new patient data.', 'info');
    }
    
    // Function to add new appointment
    function addNewAppointment() {
        const appointmentsContainer = document.getElementById('appointmentsContainer');
        const appointmentCount = appointmentsContainer.children.length + 1;
        const today = new Date();
        const formattedDate = today.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        // Calculate age if date of birth is available
        const dobInput = document.getElementById('date_of_birth');
        let ageAtOnset = '';
        let ageAutoCalculated = true;
        
        if (dobInput && dobInput.value) {
            const dob = new Date(dobInput.value);
            let age = today.getFullYear() - dob.getFullYear();
            const monthDiff = today.getMonth() - dob.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
                age--;
            }
            ageAtOnset = age;
        }
        
        const appointmentHTML = `
            <div class="appointment-section" data-appointment="${appointmentCount}">
                <div class="appointment-header">
                    <div class="appointment-title">Appointment #${appointmentCount}</div>
                    <div class="appointment-date">${formattedDate}</div>
                </div>
                
                <!-- Age at onset section for this appointment -->
                <div class="form-group appointment-age-section">
                    <label for="appointment_age_onset_${appointmentCount}">Age at disease onset (years) for this appointment</label>
                    <div class="age-input-container">
                        <input type="number" 
                               id="appointment_age_onset_${appointmentCount}" 
                               class="appointment-age-onset" 
                               min="0" 
                               max="120" 
                               value="${ageAtOnset}"
                               placeholder="Enter age">
                        <button type="button" class="btn-age-today" data-appointment="${appointmentCount}">
                            <i class="fas fa-calendar-alt"></i> Use current age
                        </button>
                    </div>
                    <div class="unknown-checkbox">
                        <input type="checkbox" id="appointment_age_onset_unknown_${appointmentCount}" class="appointment-unknown-input">
                        <label for="appointment_age_onset_unknown_${appointmentCount}">Unknown</label>
                    </div>
                </div>
                
                <!-- Smoking status for this appointment -->
                <div class="form-group" data-field="appointment_smoking_status">
                    <label>Smoking status (for this appointment)</label>
                    <div class="radio-group">
                        <div class="radio-option">
                            <input type="radio" id="appointment_smoking_no_${appointmentCount}" name="appointment_smoking_status_${appointmentCount}" value="0" checked>
                            <label for="appointment_smoking_no_${appointmentCount}">No</label>
                        </div>
                        <div class="radio-option">
                            <input type="radio" id="appointment_smoking_yes_${appointmentCount}" name="appointment_smoking_status_${appointmentCount}" value="2">
                            <label for="appointment_smoking_yes_${appointmentCount}">Yes</label>
                        </div>
                        <div class="radio-option">
                            <input type="radio" id="appointment_smoking_history_${appointmentCount}" name="appointment_smoking_status_${appointmentCount}" value="3">
                            <label for="appointment_smoking_history_${appointmentCount}">History</label>
                        </div>
                    </div>
                    <div class="unknown-checkbox">
                        <input type="checkbox" id="appointment_smoking_status_unknown_${appointmentCount}" class="appointment-unknown-input">
                        <label for="appointment_smoking_status_unknown_${appointmentCount}">Unknown</label>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="appointment_notes_${appointmentCount}">Notes</label>
                    <textarea id="appointment_notes_${appointmentCount}" class="appointment-notes" rows="3" placeholder="Enter appointment notes..."></textarea>
                </div>
                <div class="form-group">
                    <label for="appointment_tsh_${appointmentCount}">TSH (mIU/L)</label>
                    <input type="number" id="appointment_tsh_${appointmentCount}" class="appointment-tsh" step="0.01" min="0" placeholder="Enter TSH value">
                </div>
                <div class="form-group">
                    <label for="appointment_ft4_${appointmentCount}">Free T4 (pmol/L)</label>
                    <input type="number" id="appointment_ft4_${appointmentCount}" class="appointment-ft4" step="0.1" min="0" placeholder="Enter free T4 value">
                </div>
                <div class="form-group">
                    <label for="appointment_volume_${appointmentCount}">Thyroid Volume (cm³)</label>
                    <input type="number" id="appointment_volume_${appointmentCount}" class="appointment-volume" step="0.1" min="0" placeholder="Enter thyroid volume">
                </div>
            </div>
        `;
        
        appointmentsContainer.insertAdjacentHTML('beforeend', appointmentHTML);
        
        // Add event listener for the "Use current age" button
        const newAppointment = appointmentsContainer.lastElementChild;
        const ageTodayBtn = newAppointment.querySelector('.btn-age-today');
        ageTodayBtn.addEventListener('click', function() {
            const appointmentNum = this.getAttribute('data-appointment');
            const ageInput = document.getElementById(`appointment_age_onset_${appointmentNum}`);
            
            if (dobInput && dobInput.value) {
                const dob = new Date(dobInput.value);
                const today = new Date();
                let age = today.getFullYear() - dob.getFullYear();
                const monthDiff = today.getMonth() - dob.getMonth();
                
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
                    age--;
                }
                
                ageInput.value = age;
                showNotification('Current age calculated and filled!', 'success');
            } else {
                showNotification('Please enter date of birth first', 'error');
            }
        });
        
        // Add event listener for appointment unknown checkboxes
        const unknownCheckboxes = newAppointment.querySelectorAll('.appointment-unknown-input');
        unknownCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const fieldGroup = this.closest('.form-group');
                if (this.checked) {
                    fieldGroup.classList.add('disabled');
                    const inputs = fieldGroup.querySelectorAll('input:not(.appointment-unknown-input), select, textarea');
                    inputs.forEach(input => {
                        input.disabled = true;
                        if (input.type === 'radio') {
                            // For radio groups, uncheck all
                            fieldGroup.querySelectorAll('input[type="radio"]').forEach(radio => {
                                radio.checked = false;
                            });
                        } else {
                            input.value = '';
                        }
                    });
                } else {
                    fieldGroup.classList.remove('disabled');
                    const inputs = fieldGroup.querySelectorAll('input:not(.appointment-unknown-input), select, textarea');
                    inputs.forEach(input => {
                        input.disabled = false;
                    });
                }
            });
        });
        
        showNotification('New appointment added successfully!', 'success');
        
        // Scroll to the new appointment
        newAppointment.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Function to load appointments for a patient
    function loadAppointments(patientId) {
        const appointmentsContainer = document.getElementById('appointmentsContainer');
        appointmentsContainer.innerHTML = '';
        
        // Mock data - in a real app, this would come from a server
        const mockAppointments = {
            'patient1': [
                {
                    date: '2023-10-15',
                    age_onset: 42,
                    smoking_status: '0',
                    notes: 'Patient reports feeling better. Energy levels improved.',
                    tsh: 1.2,
                    ft4: 18.5,
                    volume: 20.3
                },
                {
                    date: '2023-07-20',
                    age_onset: 42,
                    smoking_status: '2',
                    notes: 'Initial follow-up after treatment adjustment.',
                    tsh: 0.8,
                    ft4: 22.1,
                    volume: 21.5
                }
            ],
            'patient2': [
                {
                    date: '2023-09-10',
                    age_onset: 56,
                    smoking_status: '3',
                    notes: 'Cardiomyopathy symptoms improved. Continue current treatment.',
                    tsh: 0.5,
                    ft4: 25.3,
                    volume: 33.8
                }
            ],
            'patient3': [
                {
                    date: '2023-11-05',
                    age_onset: 38,
                    smoking_status: '0',
                    notes: 'Patient doing well on thyroxine. Symptoms under control.',
                    tsh: 3.2,
                    ft4: 14.8,
                    volume: 17.2
                }
            ]
        };
        
        const appointments = mockAppointments[patientId] || [];
        
        appointments.forEach((appointment, index) => {
            const appointmentCount = index + 1;
            const date = new Date(appointment.date).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            
            const appointmentHTML = `
                <div class="appointment-section" data-appointment="${appointmentCount}">
                    <div class="appointment-header">
                        <div class="appointment-title">Appointment #${appointmentCount}</div>
                        <div class="appointment-date">${date}</div>
                    </div>
                    
                    <!-- Age at onset section for this appointment -->
                    <div class="form-group appointment-age-section">
                        <label for="appointment_age_onset_${appointmentCount}">Age at disease onset (years) for this appointment</label>
                        <div class="age-input-container">
                            <input type="number" 
                                   id="appointment_age_onset_${appointmentCount}" 
                                   class="appointment-age-onset" 
                                   min="0" 
                                   max="120" 
                                   value="${appointment.age_onset}"
                                   placeholder="Enter age">
                            <button type="button" class="btn-age-today" data-appointment="${appointmentCount}">
                                <i class="fas fa-calendar-alt"></i> Use current age
                            </button>
                        </div>
                        <div class="unknown-checkbox">
                            <input type="checkbox" id="appointment_age_onset_unknown_${appointmentCount}" class="appointment-unknown-input" ${appointment.age_onset === null ? 'checked' : ''}>
                            <label for="appointment_age_onset_unknown_${appointmentCount}">Unknown</label>
                        </div>
                    </div>
                    
                    <!-- Smoking status for this appointment -->
                    <div class="form-group" data-field="appointment_smoking_status">
                        <label>Smoking status (for this appointment)</label>
                        <div class="radio-group">
                            <div class="radio-option">
                                <input type="radio" id="appointment_smoking_no_${appointmentCount}" name="appointment_smoking_status_${appointmentCount}" value="0" ${appointment.smoking_status === '0' ? 'checked' : ''}>
                                <label for="appointment_smoking_no_${appointmentCount}">No</label>
                            </div>
                            <div class="radio-option">
                                <input type="radio" id="appointment_smoking_yes_${appointmentCount}" name="appointment_smoking_status_${appointmentCount}" value="2" ${appointment.smoking_status === '2' ? 'checked' : ''}>
                                <label for="appointment_smoking_yes_${appointmentCount}">Yes</label>
                            </div>
                            <div class="radio-option">
                                <input type="radio" id="appointment_smoking_history_${appointmentCount}" name="appointment_smoking_status_${appointmentCount}" value="3" ${appointment.smoking_status === '3' ? 'checked' : ''}>
                                <label for="appointment_smoking_history_${appointmentCount}">History</label>
                            </div>
                        </div>
                        <div class="unknown-checkbox">
                            <input type="checkbox" id="appointment_smoking_status_unknown_${appointmentCount}" class="appointment-unknown-input" ${!appointment.smoking_status ? 'checked' : ''}>
                            <label for="appointment_smoking_status_unknown_${appointmentCount}">Unknown</label>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="appointment_notes_${appointmentCount}">Notes</label>
                        <textarea id="appointment_notes_${appointmentCount}" class="appointment-notes" rows="3">${appointment.notes}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="appointment_tsh_${appointmentCount}">TSH (mIU/L)</label>
                        <input type="number" id="appointment_tsh_${appointmentCount}" class="appointment-tsh" step="0.01" min="0" value="${appointment.tsh}">
                    </div>
                    <div class="form-group">
                        <label for="appointment_ft4_${appointmentCount}">Free T4 (pmol/L)</label>
                        <input type="number" id="appointment_ft4_${appointmentCount}" class="appointment-ft4" step="0.1" min="0" value="${appointment.ft4}">
                    </div>
                    <div class="form-group">
                        <label for="appointment_volume_${appointmentCount}">Thyroid Volume (cm³)</label>
                        <input type="number" id="appointment_volume_${appointmentCount}" class="appointment-volume" step="0.1" min="0" value="${appointment.volume}">
                    </div>
                </div>
            `;
            
            appointmentsContainer.insertAdjacentHTML('beforeend', appointmentHTML);
        });
        
        // Add event listeners to all appointment buttons
        appointmentsContainer.querySelectorAll('.btn-age-today').forEach(btn => {
            btn.addEventListener('click', function() {
                const appointmentNum = this.getAttribute('data-appointment');
                const ageInput = document.getElementById(`appointment_age_onset_${appointmentNum}`);
                const dobInput = document.getElementById('date_of_birth');
                
                if (dobInput && dobInput.value) {
                    const dob = new Date(dobInput.value);
                    const today = new Date();
                    let age = today.getFullYear() - dob.getFullYear();
                    const monthDiff = today.getMonth() - dob.getMonth();
                    
                    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
                        age--;
                    }
                    
                    ageInput.value = age;
                    showNotification('Current age calculated and filled!', 'success');
                } else {
                    showNotification('Please enter date of birth first', 'error');
                }
            });
        });
        
        // Add event listeners to appointment unknown checkboxes
        appointmentsContainer.querySelectorAll('.appointment-unknown-input').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const fieldGroup = this.closest('.form-group');
                if (this.checked) {
                    fieldGroup.classList.add('disabled');
                    const inputs = fieldGroup.querySelectorAll('input:not(.appointment-unknown-input), select, textarea');
                    inputs.forEach(input => {
                        input.disabled = true;
                        if (input.type === 'radio') {
                            // For radio groups, uncheck all
                            fieldGroup.querySelectorAll('input[type="radio"]').forEach(radio => {
                                radio.checked = false;
                            });
                        } else {
                            input.value = '';
                        }
                    });
                } else {
                    fieldGroup.classList.remove('disabled');
                    const inputs = fieldGroup.querySelectorAll('input:not(.appointment-unknown-input), select, textarea');
                    inputs.forEach(input => {
                        input.disabled = false;
                    });
                }
            });
        });
        
        if (appointments.length > 0) {
            showNotification(`Loaded ${appointments.length} appointment(s) for patient`, 'info');
        }
    }
    
    // Function to clear appointments
    function clearAppointments() {
        document.getElementById('appointmentsContainer').innerHTML = '';
    }
    
    // Function to get appointments data
    function getAppointmentsData() {
        const appointments = document.querySelectorAll('.appointment-section');
        const appointmentsData = [];
        
        appointments.forEach((appointment, index) => {
            const appointmentNum = index + 1;
            const appointmentDate = appointment.querySelector('.appointment-date').textContent;
            const ageOnset = appointment.querySelector(`#appointment_age_onset_${appointmentNum}`)?.value;
            const smokingRadio = appointment.querySelector(`input[name="appointment_smoking_status_${appointmentNum}"]:checked`);
            const smokingStatus = smokingRadio ? smokingRadio.value : null;
            const notes = appointment.querySelector(`#appointment_notes_${appointmentNum}`)?.value;
            const tsh = appointment.querySelector(`#appointment_tsh_${appointmentNum}`)?.value;
            const ft4 = appointment.querySelector(`#appointment_ft4_${appointmentNum}`)?.value;
            const volume = appointment.querySelector(`#appointment_volume_${appointmentNum}`)?.value;
            
            appointmentsData.push({
                appointment_number: appointmentNum,
                date: appointmentDate,
                age_onset: ageOnset,
                smoking_status: smokingStatus,
                notes: notes,
                tsh: tsh,
                ft4: ft4,
                thyroid_volume: volume
            });
        });
        
        return appointmentsData;
    }
    
    // Function to show notifications
    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease;
        `;
        
        // Set color based on type
        if (type === 'success') {
            notification.style.backgroundColor = '#2ecc71';
        } else if (type === 'error') {
            notification.style.backgroundColor = '#e74c3c';
        } else {
            notification.style.backgroundColor = '#3498db';
        }
        
        notification.textContent = message;
        
        // Add to document
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
        
        // Add CSS for animations
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Initialize with first patient data
    loadPatientData('patient1');
    loadAppointments('patient1');
});
