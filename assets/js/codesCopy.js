document.addEventListener('DOMContentLoaded', function() {
  // Get all code blocks
  const codeBlocks = document.querySelectorAll('.gray pre code');
  
  // Loop through each code block and add a copy button
  codeBlocks.forEach(function(codeBlock, index) {
    // Get the parent container (.gray)
    const container = codeBlock.closest('.gray');
    
    // Make the container position relative if it's not already
    if (getComputedStyle(container).position !== 'relative') {
      container.style.position = 'relative';
    }
    
    // Create the copy button
    const copyButton = document.createElement('button');
    copyButton.className = 'btn btn-sm btn-outline-secondary copy-btn';
    copyButton.setAttribute('data-bs-toggle', 'tooltip');
    copyButton.setAttribute('data-bs-placement', 'top');
    copyButton.setAttribute('title', 'Copy to clipboard');
    copyButton.setAttribute('data-code-index', index);
    copyButton.innerHTML = '<i class="bi bi-clipboard"></i>';
    
    // Create a container for the button
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'position-absolute top-0 end-0 p-2';
    buttonContainer.appendChild(copyButton);
    
    // Add the button container to the code block container
    container.appendChild(buttonContainer);
    
    // Add click event listener for the copy button
    copyButton.addEventListener('click', function() {
      const codeText = codeBlock.textContent;
      
      navigator.clipboard.writeText(codeText).then(function() {
        // Show success state
        copyButton.innerHTML = '<i class="bi bi-check-lg"></i>';
        
        // Initialize tooltip if needed
        let tooltip = bootstrap.Tooltip.getInstance(copyButton);
        if (!tooltip) {
          tooltip = new bootstrap.Tooltip(copyButton);
        }
        
        // Change tooltip text
        copyButton.setAttribute('data-bs-original-title', 'Copied!');
        tooltip.show();
        
        // Reset after 2 seconds
        setTimeout(function() {
          copyButton.innerHTML = '<i class="bi bi-clipboard"></i>';
          copyButton.setAttribute('data-bs-original-title', 'Copy to clipboard');
          tooltip.hide();
        }, 2000);
      }).catch(function(err) {
        console.error('Could not copy text: ', err);
      });
    });
  });
  
  // Initialize all tooltips
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function(tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
});

