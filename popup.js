document.getElementById('fillBtn').addEventListener('click', async () => {
  const mainVal = document.getElementById('mainEval').value;
  const tnVal = document.getElementById('tnEval').value;
  const statusDiv = document.getElementById('status');

  try {
    // Get the current active tab
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Validate that the user is on the right domain
    if (!tab.url.includes("student.ust.edu.ph")) {
      showStatus("Error: Please open the evaluation page first.", false);
      return;
    }

    // Inject the filling function into the page
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: fillForm,
      args: [mainVal, tnVal]
    }, (results) => {
      if (chrome.runtime.lastError) {
        showStatus("Error: " + chrome.runtime.lastError.message, false);
        return;
      }
      
      const frameResult = results[0].result;
      if (frameResult && frameResult.success) {
        if (frameResult.mainFilled === 0 && frameResult.tnFilled === 0) {
            showStatus("Error: No evaluation questions found on this page.", false);
        } else {
            showStatus(`Success! Filled ${frameResult.mainFilled} main & ${frameResult.tnFilled} training questions.`, true);
        }
      } else {
        showStatus("Error: Could not process the form elements.", false);
      }
    });
  } catch (err) {
    showStatus("Error: " + err.message, false);
  }

  // Helper to show success/error banners
  function showStatus(message, isSuccess) {
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';
    statusDiv.className = isSuccess ? 'success' : 'error';
    
    // Hide the banner after 4 seconds
    setTimeout(() => { 
      statusDiv.style.display = 'none'; 
    }, 4000);
  }
});

// Context Script: This function executes INSIDE the context of the webpage
function fillForm(mainVal, tnVal) {
  try {
    let mainFilled = 0;
    let tnFilled = 0;

    // 1. Fill Main Evaluation (Triggering the onclick attributes dynamically)
    const listItems = document.querySelectorAll("li[onclick*='change_value']");
    
    // Create a regex to match the exact value passed into the change_value function
    // Example: change_value(this, '9250C25CE239D5E6ACA589E64C15D001', 4)
    const exactMatchRegex = new RegExp(`change_value\\s*\\(\\s*this\\s*,\\s*'[^']+'\\s*,\\s*${mainVal}\\s*\\)`);
    
    listItems.forEach(li => {
      if (exactMatchRegex.test(li.getAttribute('onclick'))) {
        li.click();
        mainFilled++;
      }
    });

    // 2. Fill Training Needs Assessment (Standard radio buttons)
    const radios = document.querySelectorAll(`input[type="radio"][name^="tnrating-"][value="${tnVal}"]`);
    radios.forEach(radio => {
      radio.click();
      tnFilled++;
    });

    return { success: true, mainFilled, tnFilled };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
