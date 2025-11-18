// PURPOSE OF SCRIPT:
// This file contains all of the JavaScript for the about.html page.
// It controls the functionality of the feedback form, including 
// handling user input, responding to events, and manipulating the Document Object Model (DOM). 

console.log("about.js is working!"); // Indicates that the script is working 

// Feedback form 
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM content loaded successfully!');

    // 1. Initialize EmailJS
    emailjs.init("ETjz4-TIn-_pDqupE"); // Replace with your EmailJS Public Key in Accounts
    console.log("EmailJS initialized successfully!");
    
    const form = document.getElementById("feedback-form");
    console.log('Form element:', form);
    if (!form) {
        console.error('Form element not found!');
        return;
    }

    //2. Add an event listener to the form
    form.addEventListener("submit", function(event) {
        console.log("Form submit event listener triggered.")
        event.preventDefault(); // Prevent the default form submission
        console.log("Default form submission prevented."); // Log the form element submission is loading

        // Log form values
        const formData = new FormData(form);
        for (let pair of formData.entries()) {
            console.log(`Form data: ${pair[0]} = ${pair[1]}`);
        }

        // 3. Send feedback to TXlabapp@gmail.com using EmailJS
        emailjs.sendForm("service_c535ive", "template_s8lxz69", form) // Specify the service and template IDs
            .then(function(response) { // Log the response from EmailJS
                console.log("Feedback sent successfully!", response.status, response.text); 
                
                const confirmationMessage = document.getElementById("confirmation-message");
                if (confirmationMessage) {
                    confirmationMessage.style.display = "block"; // Show the confirmation message
                }
                    console.log("Confirmation message displayed.");
               
                form.reset();
                console.log("Form reset successfully.");      
            })
            .catch(function(error) { // Log any errors from EmailJS
            console.log("Feedback failed to send.", error);
        }); // end of emailjs.sendForm promise

    }); // end of feedback form submit event listener
    console.log("Form submit event listener added successfully.");

}); // end of DOMContentLoaded event listener


