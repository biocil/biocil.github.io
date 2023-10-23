//<!-------javaScript for toggle Menu------->

var navlinks= document.getElementById("navlinks");
function showMenu(){
    navlinks.style.right="0";
}
function hideMenu(){
    navlinks.style.right="-200px";
}

     var goTopButton = document.getElementById("goTopBtn");

        // Show the button when scrolling down 20px from the top
        window.onscroll = function () {
            if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
                goTopButton.style.display = "block";
            } else {
                goTopButton.style.display = "none";
            }
        };

        // Scroll to the top when the button is clicked
        function goToTop() {
            document.body.scrollTop = 0; // For Safari
            document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE, and Opera
        }

    document.addEventListener('DOMContentLoaded', () => {
  var navlinks = document.getElementById("navlinks");
  function showMenu() {
    navlinks.style.right = "0";
  }

  function hideMenu() {
    navlinks.style.right = "-200px";
  }

  const dropdownBtn = document.getElementById('dropdown-btn');
  dropdownBtn.addEventListener('click', () => {
    const dropdownContent = document.querySelector('.dropdown-content');
    dropdownContent.classList.toggle('show');
  });

  // Close the dropdown when the user clicks outside of it
  window.addEventListener('click', (event) => {
    const dropdownContent = document.querySelector('.dropdown-content');
    if (!event.target.matches('.dropbtn')) {
      if (dropdownContent.classList.contains('show')) {
        dropdownContent.classList.remove('show');
      }
    }
  });
  function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
      const yOffset = -80; // Adjust this value to set the offset between the section and the top of the page
      const y = section.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }
    });

     $(document).ready(function() {
    // Check for URL fragment on page load
    var currentFragment = window.location.hash;

    // Handle dropdown menu clicks
    $('.dropdown-menu a').click(function(e) {
        e.preventDefault();
        var sectionToShow = $(this).data('alumni');
        $('.section').hide();
        $('index' +  sectionToShow).show();

        // Update URL fragment
        window.location.hash = sectionToShow;
    });

    // Show section based on URL fragment
    if (currentFragment) {
        $('.section').hide();
        $(currentFragment).show();
    }
});


//news and events
window.addEventListener("scroll", function() {
  var goTopBtn = document.getElementById("goTopBtn");
  if (window.pageYOffset > 100) {
    goTopBtn.style.display = "block";
  } else {
    goTopBtn.style.display = "none";
  }
});
function goToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

