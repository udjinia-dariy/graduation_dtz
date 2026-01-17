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
    
    // Unknown checkbox functionality
    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('unknown-input')) {
