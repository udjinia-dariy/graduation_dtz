document.addEventListener('DOMContentLoaded', function() {
    // ======================
    // Core Application Class
    // ======================
    class ThyroidApp {
        constructor() {
            this.components = {};
            this.initComponents();
            this.bindEvents();
            this.loadInitialData();
        }
        
        initComponents() {
            this.components = {
                form: new FormManager(),
                patients: new PatientManager(),
                appointments: new AppointmentManager(),
                risk: new RiskCalculator(),
                notifications: new NotificationManager()
            };
        }
        
        bindEvents() {
            // Form section collapse/expand
            document.querySelectorAll('.section-title').forEach(title => {
                title.addEventListener('click', (e) => 
                    this.components.form.toggleSection(e.target.closest('.section-title')));
            });
            
            // Patient selection
            document.getElementById('patientSelect').addEventListener('change', (e) => 
                this.handlePatientSelect(e.target.value));
            
            // Form actions
            document.getElementById('patientForm').addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit();
            });
            
            document.getElementById('clearFormBtn').addEventListener('click', () => 
                this.components.form.clear());
            
            document.getElementById('calculateBtn').addEventListener('click', () => 
                this.components.risk.calculate());
            
            document.getElementById('addAppointmentBtn').addEventListener('click', () => 
                this.components.appointments.add());
        }
        
        handlePatientSelect(patientId) {
            if (patientId === 'new') {
                this.components.form.clear();
                this.components.appointments.clear();
                this.components.patients.setActive(null);
            } else {
                this.components.patients.load(patientId);
                this.components.appointments.load(patientId);
            }
        }
        
        handleFormSubmit() {
            const patientData = this.components.form.getData();
            const appointmentsData = this.components.appointments.getData();
            
            console.log('Saving patient data:', patientData);
            console.log('Saving appointments data:', appointmentsData);
            
            this.components.notifications.show('Patient data saved successfully!', 'success');
            
            if (document.getElementById('patientSelect').value === 'new') {
                this.components.patients.addNew(patientData);
            }
        }
        
        loadInitialData() {
            this.components.patients.load('patient1');
            this.components.appointments.load('patient1');
        }
    }

    // ======================
    // Form Manager Component
    // ======================
    class FormManager {
        constructor() {
            this.form = document.getElementById('patientForm');
            this.initUnknownCheckboxes();
        }
        
        toggleSection(sectionTitle) {
            const sectionId = sectionTitle.dataset.section;
            const sectionContent = document.getElementById(`${sectionId}Section`);
            const icon = sectionTitle.querySelector('i.fa-chevron-down');
            
            sectionContent.classList.toggle('form-collapsed');
            icon.style.transform = sectionContent.classList.contains('form-collapsed') 
                ? 'rotate(-90deg)' : 'rotate(0deg)';
        }
        
        clear() {
            this.form.reset();
            this.resetUnknownCheckboxes();
            this.components.notifications.show('Form cleared. Ready for new patient data.', 'info');
        }
        
        getData() {
            const formData = new FormData(this.form);
            return Object.fromEntries(formData);
        }
        
        populate(data) {
            Object.entries(data).forEach(([key, value]) => {
                const input = this.form.querySelector(`[name="${key}"]`);
                if (!input) return;
                
                if (input.type === 'radio') {
                    const radio = this.form.querySelector(`[name="${key}"][value="${value}"]`);
                    if (radio) {
                        radio.checked = true;
                        this.resetUnknownCheckbox(key);
                    }
                } else {
                    input.value = value;
                    this.resetUnknownCheckbox(key);
                }
            });
        }
        
        initUnknownCheckboxes() {
            document.addEventListener('change', (e) => {
                if (e.target.classList.contains('unknown-input')) {
                    this.handleUnknownCheckbox(e.target);
                }
            });
        }
        
        handleUnknownCheckbox(checkbox) {
            const fieldId = checkbox.id.replace('_unknown', '');
            const formGroup = checkbox.closest('.form-group');
            
            formGroup.classList.toggle('disabled', checkbox.checked);
            
            const input = formGroup.querySelector('input:not(.unknown-input), select, textarea');
            if (!input) return;
            
            if (checkbox.checked) {
                input.disabled = true;
                if (input.type === 'radio') {
                    formGroup.querySelectorAll('input[type="radio"]').forEach(radio => {
                        radio.checked = false;
                    });
                } else {
                    input.value = '';
                }
            } else {
                input.disabled = false;
            }
        }
        
        resetUnknownCheckbox(fieldName) {
            const checkbox = document.getElementById(`${fieldName}_unknown`);
            if (checkbox) {
                checkbox.checked = false;
                const formGroup = checkbox.closest('.form-group');
                formGroup.classList.remove('disabled');
            }
        }
        
        resetUnknownCheckboxes() {
            document.querySelectorAll('.unknown-input').forEach(checkbox => {
                checkbox.checked = false;
                const formGroup = checkbox.closest('.form-group');
                if (formGroup) {
                    formGroup.classList.remove('disabled');
                    const input = formGroup.querySelector('input:not(.unknown-input), select, textarea');
                    if (input) input.disabled = false;
                }
            });
        }
    }

    // ========================
    // Patient Manager Component
    // ========================
    class PatientManager {
        constructor() {
            this.select = document.getElementById('patientSelect');
            this.items = document.querySelectorAll('.patient-item');
            this.bindPatientItemClicks();
            this.patientData = this.getMockData();
        }
        
        bindPatientItemClicks() {
            this.items.forEach(item => {
                item.addEventListener('click', () => {
                    const patientId = item.dataset.id;
                    this.select.value = patientId;
                    this.setActive(patientId);
                    app.components.form.populate(this.patientData[patientId] || {});
                    app.components.appointments.load(patientId);
                });
            });
        }
        
        load(patientId) {
            const data = this.patientData[patientId];
            if (data) {
                app.components.form.populate(data);
                this.setActive(patientId);
                this.setFormTitle(this.getPatientName(patientId));
                app.components.notifications.show(`Loaded data for ${this.getPatientName(patientId)}`);
            }
        }
        
        setActive(patientId) {
            this.items.forEach(item => {
                item.classList.toggle('active', item.dataset.id === patientId);
            });
        }
        
        addNew(patientData) {
            const newId = `patient${this.items.length + 1}`;
            const patientName = `Patient #00${this.items.length + 1}`;
            
            // Add to dropdown
            const option = this.createOption(newId, patientName);
            this.select.appendChild(option);
            this.select.value = newId;
            
            // Add to list
            const patientItem = this.createPatientItem(newId, patientName, patientData);
            document.querySelector('.patient-list').appendChild(patientItem);
            
            // Rebind events
            this.items = document.querySelectorAll('.patient-item');
            this.bindPatientItemClicks();
            
            this.setFormTitle(patientName);
        }
        
        createOption(value, text) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = text;
            return option;
        }
        
        createPatientItem(id, name, data) {
            const div = document.createElement('div');
            div.className = 'patient-item';
            div.dataset.id = id;
            
            const age = data.date_of_birth ? this.calculateAge(data.date_of_birth) : '';
            const ageDisplay = age ? `Age: ${age}` : '';
            
            div.innerHTML = `
                <div>
                    <div class="patient-id">${name}</div>
                    <div class="patient-age">${ageDisplay} | Diagnosis: New case</div>
                </div>
                <div class="patient-risk risk-low">New</div>
            `;
            
            return div;
        }
        
        calculateAge(dob) {
            const birthDate = new Date(dob);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return age;
        }
        
        setFormTitle(title) {
            document.querySelector('.content h2').innerHTML = `<i class="fas fa-edit"></i> ${title}`;
        }
        
        getPatientName(patientId) {
            const names = {
                'patient1': 'Maria Ivanova',
                'patient2': 'Dmitry Sokolov', 
                'patient3': 'Elena Petrova'
            };
            return names[patientId] || 'Patient';
        }
        
        getMockData() {
            return {
                'patient1': {
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
                },
                'patient2': {
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
                },
                'patient3': {
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
                }
            };
        }
    }

    // ===========================
    // Appointment Manager Component
    // ===========================
    
    // ==============================
    // Base Field Group Class
    // ==============================
    class FieldGroup {
        constructor(config) {
            this.config = config;
            this.id = config.id;
            this.name = config.name;
            this.label = config.label;
            this.value = config.value || '';
            this.placeholder = config.placeholder || '';
            this.required = config.required || false;
            this.unknown = config.unknown || false;
        }
        
        render() {
            throw new Error('Method "render" must be implemented');
        }
        
        getData() {
            throw new Error('Method "getData" must be implemented');
        }
        
        bindEvents(container) {
            // Bind unknown checkbox if it exists
            const unknownCheckbox = container.querySelector(`#${this.id}_unknown`);
            if (unknownCheckbox) {
                unknownCheckbox.addEventListener('change', (e) => this.handleUnknownCheckbox(e.target));
            }
        }
        
        handleUnknownCheckbox(checkbox) {
            const formGroup = checkbox.closest('.form-group');
            const isChecked = checkbox.checked;
            
            formGroup.classList.toggle('disabled', isChecked);
            
            const inputs = formGroup.querySelectorAll('input:not(.unknown-input), select, textarea');
            inputs.forEach(input => {
                if (isChecked) {
                    input.disabled = true;
                    if (input.type === 'radio') {
                        formGroup.querySelectorAll('input[type="radio"]').forEach(radio => {
                            radio.checked = false;
                        });
                    } else {
                        input.value = '';
                    }
                } else {
                    input.disabled = false;
                }
            });
        }
    }

    // ==============================
    // Numeric Input Group
    // ==============================
    class NumericInputGroup extends FieldGroup {
        constructor(config) {
            super(config);
            this.step = config.step || '0.01';
            this.min = config.min || '0';
            this.unit = config.unit || '';
        }
        
        render() {
            const unitHtml = this.unit ? `<span class="field-unit">${this.unit}</span>` : '';
            
            return `
                <div class="form-group" data-field="${this.name}">
                    <label for="${this.id}">${this.label}</label>
                    <div class="input-with-unit">
                        <input type="number" 
                              id="${this.id}" 
                              name="${this.name}" 
                              value="${this.value}" 
                              step="${this.step}" 
                              min="${this.min}"
                              placeholder="${this.placeholder}"
                              ${this.required ? 'required' : ''}>
                        ${unitHtml}
                    </div>
                    <div class="unknown-checkbox">
                        <input type="checkbox" id="${this.id}_unknown" class="unknown-input" ${this.unknown ? 'checked' : ''}>
                        <label for="${this.id}_unknown">Unknown</label>
                    </div>
                </div>
            `;
        }
        
        getData(container) {
            const input = container.querySelector(`#${this.id}`);
            return {
                [this.name]: input ? input.value : ''
            };
        }
    }

    // ==============================
    // Binary Radio Group
    // ==============================
    class BinaryRadioGroup extends FieldGroup {
        constructor(config) {
            super(config);
            this.options = config.options || [
                { value: '0', label: 'No' },
                { value: '1', label: 'Yes' }
            ];
        }
        
        render() {
            const radioOptions = this.options.map(opt => `
                <div class="radio-option">
                    <input type="radio" 
                          id="${this.id}_${opt.value}" 
                          name="${this.name}" 
                          value="${opt.value}" 
                          ${this.value === opt.value ? 'checked' : ''}>
                    <label for="${this.id}_${opt.value}">${opt.label}</label>
                </div>
            `).join('');
            
            return `
                <div class="form-group" data-field="${this.name}">
                    <label>${this.label}</label>
                    <div class="radio-group">
                        ${radioOptions}
                    </div>
                    <div class="unknown-checkbox">
                        <input type="checkbox" id="${this.id}_unknown" class="unknown-input" ${this.unknown ? 'checked' : ''}>
                        <label for="${this.id}_unknown">Unknown</label>
                    </div>
                </div>
            `;
        }
        
        getData(container) {
            const selectedRadio = container.querySelector(`input[name="${this.name}"]:checked`);
            return {
                [this.name]: selectedRadio ? selectedRadio.value : ''
            };
        }
    }

    // ==============================
    // Multi Radio Group
    // ==============================
    class MultiRadioGroup extends FieldGroup {
        constructor(config) {
            super(config);
            this.options = config.options;
        }
        
        render() {
            const radioOptions = this.options.map(opt => `
                <div class="radio-option">
                    <input type="radio" 
                          id="${this.id}_${opt.value}" 
                          name="${this.name}" 
                          value="${opt.value}" 
                          ${this.value === opt.value ? 'checked' : ''}>
                    <label for="${this.id}_${opt.value}">${opt.label}</label>
                </div>
            `).join('');
            
            return `
                <div class="form-group" data-field="${this.name}">
                    <label>${this.label}</label>
                    <div class="radio-group">
                        ${radioOptions}
                    </div>
                    <div class="unknown-checkbox">
                        <input type="checkbox" id="${this.id}_unknown" class="unknown-input" ${this.unknown ? 'checked' : ''}>
                        <label for="${this.id}_unknown">Unknown</label>
                    </div>
                </div>
            `;
        }
        
        getData(container) {
            const selectedRadio = container.querySelector(`input[name="${this.name}"]:checked`);
            return {
                [this.name]: selectedRadio ? selectedRadio.value : ''
            };
        }
    }

    // ==============================
    // Text Area Group
    // ==============================
    class TextAreaGroup extends FieldGroup {
        constructor(config) {
            super(config);
            this.rows = config.rows || 3;
        }
        
        render() {
            return `
                <div class="form-group" data-field="${this.name}">
                    <label for="${this.id}">${this.label}</label>
                    <textarea id="${this.id}" 
                              name="${this.name}" 
                              rows="${this.rows}" 
                              placeholder="${this.placeholder}"
                              ${this.required ? 'required' : ''}>${this.value}</textarea>
                </div>
            `;
        }
        
        getData(container) {
            const textarea = container.querySelector(`#${this.id}`);
            return {
                [this.name]: textarea ? textarea.value : ''
            };
        }
    }

    // ==============================
    // Age Input Group (Special)
    // ==============================
    class AgeInputGroup extends FieldGroup {
        constructor(config) {
            super(config);
            this.appointmentNum = config.appointmentNum;
        }
        
        render() {
            return `
                <div class="form-group appointment-age-section" data-field="${this.name}">
                    <label for="${this.id}">${this.label}</label>
                    <div class="age-input-container">
                        <input type="number" 
                              id="${this.id}" 
                              class="appointment-age-onset" 
                              min="0" 
                              max="120" 
                              value="${this.value}"
                              placeholder="Enter age">
                        <button type="button" class="btn-age-today" data-appointment="${this.appointmentNum}">
                            <i class="fas fa-calendar-alt"></i> Use current age
                        </button>
                    </div>
                    <div class="unknown-checkbox">
                        <input type="checkbox" id="${this.id}_unknown" class="appointment-unknown-input" ${this.unknown ? 'checked' : ''}>
                        <label for="${this.id}_unknown">Unknown</label>
                    </div>
                </div>
            `;
        }
        
        getData(container) {
            const input = container.querySelector(`#${this.id}`);
            return {
                [this.name]: input ? input.value : ''
            };
        }
        
        bindEvents(container) {
            super.bindEvents(container);
            
            // Bind "Use current age" button
            const ageTodayBtn = container.querySelector('.btn-age-today');
            if (ageTodayBtn) {
                ageTodayBtn.addEventListener('click', () => this.handleAgeToday(ageTodayBtn));
            }
        }
        
        handleAgeToday(button) {
            const dobInput = document.getElementById('date_of_birth');
            const appointmentNum = button.dataset.appointment;
            const ageInput = document.getElementById(`appointment_age_onset_${appointmentNum}`);
            
            if (dobInput?.value) {
                const age = this.calculateAge(dobInput.value);
                ageInput.value = age;
                app.components.notifications.show('Current age calculated and filled!', 'success');
            } else {
                app.components.notifications.show('Please enter date of birth first', 'error');
            }
        }
        
        calculateAge(dob) {
            const birthDate = new Date(dob);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return age;
        }
    }

    // ==============================
    // Appointment Manager (Updated)
    // ==============================
    class AppointmentManager {
        constructor() {
            this.container = document.getElementById('appointmentsContainer');
            this.mockData = this.getMockData();
            this.fieldGroups = this.defineFieldGroups();
        }
        
        defineFieldGroups() {
            return {
                // Numeric inputs
                us1_thyroid_volume: {
                    type: 'numeric',
                    label: 'Thyroid Volume (cm³)',
                    step: '0.1',
                    unit: 'cm³'
                },
                us1_nodules_cm: {
                    type: 'numeric',
                    label: 'Size of nodules (cm)',
                    step: '0.1',
                    unit: 'cm'
                },
                tsh_1: {
                    type: 'numeric',
                    label: 'TSH',
                    step: '0.01',
                    unit: 'mIU/L'
                },
                ft4_1: {
                    type: 'numeric',
                    label: 'Free T4',
                    step: '0.1',
                    unit: 'pmol/L'
                },
                ft3_1: {
                    type: 'numeric',
                    label: 'Free T3',
                    step: '0.1',
                    unit: 'pmol/L'
                },
                ft3_to_ft4_ratio: {
                    type: 'numeric',
                    label: 'Free T3/Free T4 ratio',
                    step: '0.01'
                },
                tsh_3: {
                    type: 'numeric',
                    label: 'TSH after 1.5 years',
                    step: '0.01',
                    unit: 'mIU/L'
                },
                us3_thyroid_volume: {
                    type: 'numeric',
                    label: 'Thyroid volume after 1.5 years',
                    step: '0.1',
                    unit: 'cm³'
                },
                us3_nodules_cm: {
                    type: 'numeric',
                    label: 'Size of nodules after 1.5 years',
                    step: '0.1',
                    unit: 'cm'
                },
                
                // Binary radio groups
                us1_nodules: {
                    type: 'binary',
                    label: 'Presence of nodules'
                },
                exophthalmos: {
                    type: 'binary',
                    label: 'Exophthalmos'
                },
                thyrotoxic_cardiomyopathy: {
                    type: 'binary',
                    label: 'Thyrotoxic cardiomyopathy'
                },
                us3_nodules: {
                    type: 'binary',
                    label: 'Nodules after 1.5 years'
                },
                
                // Multi radio groups
                smoking_status: {
                    type: 'multi',
                    label: 'Smoking status',
                    options: [
                        { value: '0', label: 'No' },
                        { value: '2', label: 'Yes' },
                        { value: '3', label: 'History' }
                    ]
                },
                treatment_type: {
                    type: 'multi',
                    label: 'Medication type',
                    options: [
                        { value: '0', label: 'Thyroxine' },
                        { value: '1', label: 'Mercasolil' },
                        { value: '2', label: 'Combination' }
                    ]
                },
                
                // Text area
                notes: {
                    type: 'textarea',
                    label: 'Notes',
                    rows: 3
                }
            };
        }
        
        createFieldInstance(type, config) {
            switch (type) {
                case 'numeric':
                    return new NumericInputGroup(config);
                case 'binary':
                    return new BinaryRadioGroup(config);
                case 'multi':
                    return new MultiRadioGroup(config);
                case 'textarea':
                    return new TextAreaGroup(config);
                case 'age':
                    return new AgeInputGroup(config);
                default:
                    throw new Error(`Unknown field type: ${type}`);
            }
        }
        
        createAppointmentHTML(num, data = {}) {
            const today = new Date();
            const formattedDate = data.date ? 
                new Date(data.date).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                }) : 
                today.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
            
            // Create age field (special case)
            const dobInput = document.getElementById('date_of_birth');
            let ageAtOnset = data.age_onset || '';
            
            if (!ageAtOnset && dobInput?.value) {
                ageAtOnset = this.calculateAge(dobInput.value);
            }
            
            const ageField = this.createFieldInstance('age', {
                id: `appointment_age_onset_${num}`,
                name: `appointment_age_onset_${num}`,
                label: 'Age at disease onset (years)',
                value: ageAtOnset,
                appointmentNum: num,
                unknown: data.age_onset === null
            });
            
            // Create all other fields
            const fieldInstances = [];
            
            // Add age field first
            fieldInstances.push(ageField);
            
            // Create instances for all defined field groups
            Object.entries(this.fieldGroups).forEach(([fieldName, fieldConfig]) => {
                const fieldData = {
                    id: `appointment_${fieldName}_${num}`,
                    name: `appointment_${fieldName}_${num}`,
                    label: fieldConfig.label,
                    value: data[fieldName] || '',
                    unknown: data[fieldName] === undefined || data[fieldName] === null,
                    ...fieldConfig
                };
                
                const instance = this.createFieldInstance(fieldConfig.type, fieldData);
                fieldInstances.push(instance);
            });
            
            // Render all fields
            const fieldsHTML = fieldInstances.map(field => field.render()).join('');
            
            return `
                <div class="appointment-section" data-appointment="${num}">
                    <div class="appointment-header">
                        <div class="appointment-title">Appointment #${num}</div>
                        <div class="appointment-date">${formattedDate}</div>
                    </div>
                    <div class="appointment-content">
                        ${fieldsHTML}
                    </div>
                </div>
            `;
        }
        
        add() {
            const appointmentNum = this.container.children.length + 1;
            const appointmentHTML = this.createAppointmentHTML(appointmentNum);
            this.container.insertAdjacentHTML('beforeend', appointmentHTML);
            
            const newAppointment = this.container.lastElementChild;
            this.bindAppointmentEvents(newAppointment, appointmentNum);
            
            app.components.notifications.show('New appointment added successfully!', 'success');
            newAppointment.scrollIntoView({ behavior: 'smooth' });
        }
        
        bindAppointmentEvents(appointmentEl, appointmentNum) {
            // Get all field instances for this appointment
            const fieldInstances = [];
            
            // Age field
            const ageField = new AgeInputGroup({
                id: `appointment_age_onset_${appointmentNum}`,
                name: `appointment_age_onset_${appointmentNum}`,
                label: 'Age at disease onset (years)',
                appointmentNum: appointmentNum
            });
            fieldInstances.push(ageField);
            
            // Other fields
            Object.entries(this.fieldGroups).forEach(([fieldName, fieldConfig]) => {
                const fieldData = {
                    id: `appointment_${fieldName}_${appointmentNum}`,
                    name: `appointment_${fieldName}_${appointmentNum}`,
                    label: fieldConfig.label,
                    ...fieldConfig
                };
                
                const instance = this.createFieldInstance(fieldConfig.type, fieldData);
                fieldInstances.push(instance);
            });
            
            // Bind events for each field
            fieldInstances.forEach(field => {
                field.bindEvents(appointmentEl);
            });
            
            // Make appointment collapsible
            const header = appointmentEl.querySelector('.appointment-header');
            if (header) {
                const collapseIcon = document.createElement('i');
                collapseIcon.className = 'fas fa-chevron-down appointment-collapse-icon';
                header.appendChild(collapseIcon);
                
                header.addEventListener('click', (e) => {
                    if (!e.target.closest('.btn-age-today')) {
                        appointmentEl.classList.toggle('appointment-collapsed');
                        collapseIcon.style.transform = appointmentEl.classList.contains('appointment-collapsed') 
                            ? 'rotate(-90deg)' : 'rotate(0deg)';
                    }
                });
            }
        }
        
        getData() {
            return Array.from(this.container.children).map((appointment, index) => {
                const num = index + 1;
                const data = {};
                
                // Get age data
                const ageInput = appointment.querySelector(`#appointment_age_onset_${num}`);
                if (ageInput) data.age_onset = ageInput.value;
                
                // Get data from all field groups
                Object.keys(this.fieldGroups).forEach(fieldName => {
                    const fieldConfig = this.fieldGroups[fieldName];
                    let fieldValue = '';
                    
                    if (fieldConfig.type === 'binary' || fieldConfig.type === 'multi') {
                        const selectedRadio = appointment.querySelector(`input[name="appointment_${fieldName}_${num}"]:checked`);
                        fieldValue = selectedRadio ? selectedRadio.value : '';
                    } else {
                        const input = appointment.querySelector(`#appointment_${fieldName}_${num}`);
                        fieldValue = input ? input.value : '';
                    }
                    
                    data[fieldName] = fieldValue;
                });
                
                // Add appointment metadata
                data.appointment_number = num;
                data.date = appointment.querySelector('.appointment-date').textContent;
                
                return data;
            });
        }
        
        calculateAge(dob) {
            const birthDate = new Date(dob);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return age;
        }
        
        getMockData() {
            return {
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
        }
    }


    // ==========================
    // Risk Calculator Component
    // ==========================
    class RiskCalculator {
        calculate() {
            const formData = app.components.form.getData();
            const appointments = app.components.appointments.getData();
            
            // Get latest appointment data
            let ageOnset = 35;
            let smokingStatus = '0';
            
            if (appointments.length > 0) {
                const latest = appointments[appointments.length - 1];
                ageOnset = latest.age_onset ? parseInt(latest.age_onset) : 35;
                smokingStatus = latest.smoking_status || '0';
            }
            
            // Calculate risk score
            const riskScore = this.calculateRiskScore({ ...formData, age_onset: ageOnset, smoking_status: smokingStatus });
            const riskData = this.determineRiskLevel(riskScore);
            
            // Update UI
            this.updateResultWidget(riskData, riskScore);
            
            app.components.notifications.show('Risk assessment completed!', 'success');
            document.getElementById('resultWidget').scrollIntoView({ behavior: 'smooth' });
        }
        
        calculateRiskScore(data) {
            const riskFactors = [
                { condition: () => data.age_onset > 50, score: 25 },
                { condition: () => data.age_onset > 40 && data.age_onset <= 50, score: 15 },
                { condition: () => data.age_onset <= 40, score: 5 },
                { condition: () => data.heredity === '1', score: 20 },
                { condition: () => data.smoking_status === '2', score: 25 },
                { condition: () => data.smoking_status === '3', score: 15 },
                { condition: () => data.sex === '1', score: 10 },
                { condition: () => parseFloat(data.us1_thyroid_volume) > 30, score: 15 },
                { condition: () => data.us1_nodules === '1', score: 10 },
                { condition: () => parseFloat(data.tsh_1) < 0.1, score: 10 },
                { condition: () => parseFloat(data.ft4_1) > 30, score: 10 },
                { condition: () => data.exophthalmos === '1', score: 15 },
                { condition: () => data.thyrotoxic_cardiomyopathy === '1', score: 20 },
                { condition: () => parseFloat(data.tsh_3) < 0.5 || parseFloat(data.tsh_3) > 4.5, score: 15 },
                { condition: () => data.us3_nodules === '1', score: 10 }
            ];
            
            let score = riskFactors.reduce((total, factor) => 
                factor.condition() ? total + factor.score : total, 0);
            
            return Math.min(100, score);
        }
        
        determineRiskLevel(score) {
            if (score < 30) {
                return {
                    level: "Low Risk",
                    class: "low-risk",
                    description: "Based on the patient data, there is a low risk of thyroid disease recurrence.",
                    recommendation: "Continue standard follow-up annually"
                };
            } else if (score < 60) {
                return {
                    level: "Medium Risk",
                    class: "medium-risk",
                    description: "Based on the patient data, there is a moderate risk of thyroid disease recurrence.",
                    recommendation: "Continue monitoring every 6 months"
                };
            } else {
                return {
                    level: "High Risk",
                    class: "high-risk",
                    description: "Based on the patient data, there is a high risk of thyroid disease recurrence.",
                    recommendation: "Consider additional treatment options and monitor every 3 months"
                };
            }
        }
        
        getKeyFactors(data) {
            const factors = [];
            if (data.heredity === '1') factors.push("Family history");
            if (data.smoking_status === '2' || data.smoking_status === '3') factors.push("Smoking history");
            if (parseFloat(data.tsh_1) < 0.1) factors.push("Very low initial TSH");
            if (data.exophthalmos === '1') factors.push("Exophthalmos");
            if (data.thyrotoxic_cardiomyopathy === '1') factors.push("Cardiomyopathy");
            
            return factors.length > 0 ? factors.join(", ") : "None identified";
        }
        
        updateResultWidget(riskData, score) {
            const widget = document.getElementById('resultWidget');
            const formData = app.components.form.getData();
            const appointments = app.components.appointments.getData();
            
            document.getElementById('riskLevel').textContent = riskData.level;
            document.getElementById('riskLevel').className = `risk-level ${riskData.class}`;
            document.getElementById('riskDescription').textContent = riskData.description;
            document.getElementById('recurrenceProbability').textContent = `${score}%`;
            
            // Get data for key factors
            let latestData = {};
            if (appointments.length > 0) {
                const latest = appointments[appointments.length - 1];
                latestData = { ...formData, smoking_status: latest.smoking_status };
            }
            
            document.getElementById('keyFactors').textContent = this.getKeyFactors(latestData);
            document.getElementById('recommendation').textContent = riskData.recommendation;
            
            widget.style.display = 'block';
        }
    }

    // ==============================
    // Notification Manager Component
    // ==============================
    class NotificationManager {
        show(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            
            notification.innerHTML = `
                <div class="notification-content">
                    <i class="fas ${this.getIcon(type)}"></i>
                    <span>${message}</span>
                </div>
            `;
            
            document.body.appendChild(notification);
            
            // Animate in
            setTimeout(() => notification.classList.add('show'), 10);
            
            // Remove after 3 seconds
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 3000);
            
            this.ensureStyles();
        }
        
        getIcon(type) {
            const icons = {
                'success': 'fa-check-circle',
                'error': 'fa-exclamation-circle',
                'info': 'fa-info-circle'
            };
            return icons[type] || 'fa-info-circle';
        }
        
        ensureStyles() {
            if (!document.getElementById('notification-styles')) {
                const style = document.createElement('style');
                style.id = 'notification-styles';
                style.textContent = `
                    .notification {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        padding: 15px 20px;
                        border-radius: 8px;
                        color: white;
                        font-weight: 600;
                        z-index: 1000;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                        transform: translateX(100%);
                        opacity: 0;
                        transition: all 0.3s ease;
                    }
                    .notification.show {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    .notification-success { background-color: #2ecc71; }
                    .notification-error { background-color: #e74c3c; }
                    .notification-info { background-color: #3498db; }
                    .notification-content {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                `;
                document.head.appendChild(style);
            }
        }
    }

    // Initialize the application
    const app = new ThyroidApp();
});
