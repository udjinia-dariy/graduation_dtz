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
