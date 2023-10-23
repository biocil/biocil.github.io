 // script code for Research Tab
    document.addEventListener("DOMContentLoaded", () => {
      const projectBoxes = document.querySelectorAll(".project-box");
      const modalOverlay = document.getElementById("modalOverlay");
      const modalContent = document.getElementById("modalContent");
      const closeModal = document.getElementById("closeModal");

      // Sample project data (you can replace this with your actual data)
      const projects = {
        project1: {
          team: "M. F. Toy (PI), T. Gurcan (Graduate Student), E. Tekin (Graduate Student), Z. Ozbilgin (Undergraduate Student), S. Aksit (Undergraduate Student), D. Dikel (Undergraduate Student)",
          budget: "508’000 Liras (~67k$ on date of start)",
          abstract:
              " In the scope of this project, a system enabling the imaging of an interface between a cell and its substrate, " +
              "without the need of any label, is currently being designed and developed. The system is based on holographic " +
              "microscopy principle. The interfacial proteins’ position and depth information can be extracted from a complex " +
              "field that experiences a total internal reflection at the interface. An early example of a total internal reflection " +
              "holographic microscopy exists in the literature. However, this prism based system is limited to low resolution imaging" +
              " with strong imaging artifacts. Within this project, a high numerical aperture microscope objective is employed to " +
              "create total internal reflection. The same microscope objective also collects the reflected field as well. With such" +
              " an approach interfacial imaging at high resolution is possible. The principle of digital holography is utilized for " +
              "the reconstruction of complex field, and the general scheme of the microscopy setup is in the form of an off-axis holographic microscopy.",
          output:
              "Gürcan, T., & Toy, M. F. (2022, May). Total internal reflection holographic microscopy for cellular imaging. In Unconventional Optical Imaging III (Vol. 12136, pp. 18-22). SPIE.\n" +
              "Gürcan, T., & Toy, M. F. (2021, September). Total internal reflection holographic microscopy for interfacial imaging. Fotonik 2021, 22. Ulusal Optik, Elektro-Optik ve Fotonik Çalıştayı.",
        },
        project2: {
          team: "M. F. Toy (PI), B. E. Kerman (Researcher), T. Oguz (Graduate Student), T. Ozil Turan (Graduate Student)",
          budget: "577’000 Liras (~164k$ on date of start)",
          abstract: "In scope of this project it was aimed to develop a microscopic imaging system that has two modes of operation. The developed system is aimed to be used for the 3D quantitative, label-free, and non invasive live cell imaging. \n" +
              "\n" +
              "Progression in the field of microscopic imaging has been one of the driving locomotives for the advancement in life sciences. Fluorescence microscopy, where fluorescent molecules are used as labels, has been a routinely utilized gold standard technique with its high selectivity. However, the low energy conversion efficiency of fluorescence mechanism, photobleaching, and the photo-toxic effect of the excitation light limit the application of this technique on extended duration live cell imaging. \n" +
              "Quantitative phase microscopy as a novel and label free technique has a significant potential in the field of microscopic imaging. The essential value of this technique lies in the complex wavefield images acquired using the technique. Complex wavefield simultaneously contains both the absorption and the optical path variations (optical wave phase) in a quantitative manner. The quantitative phase can be directly linked to the morphological or chemical properties of the sample. Recently developed 3D (tomographic) quantitative phase microscopy techniques (diffraction tomography) have enabled the tomographic refractive index imaging of a sample. With the intrinsic selectivity of refractive index, label free techniques have the potential to substitute fluorescence microscopy for the first time. \n" +
              "3D quantitative phase microscopy systems developed so far have generally been separated systems that cannot offer the simultaneous imaging of a sample utilizing various techniques. In scope of this project, essential aim was to construct for the first time a 3D quantitative phase microscopy system combined together with fluorescence microscopy. The multi-wavelength operation of 3D quantitative phase microscopy is another novelty of this project proposal. Thanks to the measured dispersion of refractive index, imaging has a high degree of selectivity on top of the high sensitivity. In scope of the project live cell experiments were carried in a systematic and comparative way. \n" +
              "This project has three separate groups of actions; design and construction of the microscopy system, development of the system control and data processing software, and the tests on live cells. \n" +
              "Digital holographic microscopy technique is the basis for the design of the microscopy system. The in-vitro sample is illuminated from various angular directions with the help of the tomographic scan head, and the diffracted wavefield is reconstructed by the digital holography principle. Fluorescence microscopy is in the epi illumination configuration. Optical resolution of the system was tested by imaging resolution targets, and its agreement with the resolution limit was verified. Accuracy testing of the 3D quantitative phase microscopy is based on the microparticles with known morphology and refractive index. \n" +
              "Within the second action, control electronics of the system and computer interface were designed. Also, the algorithms for tomographic image reconstruction from digital holograms were developed in this action. Here data synthesis was carried in 3D Fourier space benefiting from the diffraction tomography principle. \n" +
              "In the last group, live cell cultures were used for characterization the system. To serve this purpose, cells labeled with morphological fluorophores were imaged. ",
          output: "Toy, M. F., Vatandaslar, B. K., & Kerman, B. E. (2019, March). Refractive index tomography of myelinating glial cells. In Quantitative Phase Imaging V (Vol. 10887, pp. 97-101). SPIE.",
        },
        project3: {
          team: "M. F. Toy (PI), B. Ozgurun (Researcher)",
          budget: " 1’500’000 Liras (~430k$ on date of start)",
          abstract: "-",
          output: "Toy, M. F. (2019). Wedge prism assisted quantitative phase imaging on standard microscopes. Optics Communications, 451, 361-366.",
        },
        project4: {
          team: "F. Civitci (PI), O. Ferhanoglu (Researcher), M. F. Toy (Researcher), S. K. Cetindag (Graduate Student)",
          budget: " 360’000 Liras (~124k$ on date of start)",
          abstract: "The aim of this project was to develop an optical spectrometer system with a central wavelength of" +
              " 850 nm, which theoretically has infinite free spectral space and high resolution. Moreover, the proposed " +
              "spectrometer was shown to be applicable for fiber optic based Optical Coherence Tomography (OCT) whose " +
              "performance parameters (i.e., resolution and maximum depth) were estimated.",
          output: "Ferhanoglu, O., Toy, M. F., Cetindag, S. K., & Civitci, F. (2022). U.S. Patent No. 11,231,322. Washington, DC: U.S. Patent and Trademark Office.\n" +
              "Çetindağ, S. K., Toy, M. F., Ferhanoğlu, O., & Civitci, F. (2020). Scattering metal waveguide based speckle-enhanced prism spectrometry. Journal of Lightwave Technology, 38(7), 2022-2027.\n" +
              "Çetindağ, Ş. K., Ferhanoğlu, O., Toy, M. F., & Civitci, F. (2019, July). Speckle-enhanced prism spectrometer. In 2019 International Conference on Optical MEMS and Nanophotonics (OMN) (pp. 84-85). IEEE.\n" +
              "Çetindağ, Ş. K., Toy, M. F., Ferhanoğlu, O., & Civitci, F. (2018). A speckle-enhanced prism spectrometer with high dynamic range. IEEE Photonics Technology Letters, 30(24), 2139-2142.",
        },
        project5: {
          team: "M. F. Toy (PI)",
          budget: "108’000 Liras (~40k$ on date of start)",
          abstract: "-",
          output: "Gürcan, T., & Toy, M. F. (2022, May). Maskless lithography with holographic feedback for the fabrication of optical elements. In 3D Printed Optics and Additive Photonic Manufacturing III (Vol. 12135, pp. 56-60). SPIE.\n" +
              "Toy, M. F. (2021). Quantitative phase macroscopic system for label-free imaging of tissue sections. Electrica.\n" +
              "Hong, A., Zeydan, B., Charreyron, S., Ergeneman, O., Pané, S., Toy, M. F., ... & Nelson, B. J. (2016). Real-time holographic tracking and control of microrobots. IEEE Robotics and Automation Letters, 2(1), 143-148.",
        },
        project6: {
          involved_student: "S. Aksit, Z. Ozbilgin",
          budget: " 4’000 Liras",
          abstract: "-",
          output: "Ozbilgin, Z., Aksit, S., & Toy, M. F. (2022, May). An integrated top-stage incubator and lens-free holographic imaging system for culture monitoring applications. In Unconventional Optical Imaging III (Vol. 12136, pp. 225-231). SPIE.\n" +
              "Özbilgin, Z., Toy, M. F., & Akşit, S. (2021, November). Low-cost top stage incubator for live cell imaging applications. In 2021 Medical Technologies Congress (TIPTEKNO) (pp. 1-4). IEEE.",
        },
        project7: {
          involved_student: "A. Aksan, E. Erakin, E. Bayar",
          budget: "4’000 Liras",
          abstract: "The localization of veins is a crucial procedure in medicine for both administering intravenous medications and obtaining blood samples from patients. However, in some cases, identifying veins can be challenging due to factors such as skin color, ethnicity, age, and body weight [1]. Incorrect needle placement can lead to complications in the form of allergic reactions, vascular injuries, and trauma in the affected area [2]. To accurately locate veins, several methods are available, with Near-Infrared (NIR) Imaging being one of the popular choices. Nevertheless, researchers still face challenges related to issues like age, weight, skin tone, and ethnicity [3]. Therefore, there is a need for a method that can localize and visualize veins regardless of the patient's characteristics.\n" +
              "\n" +
              "The objective of this project is to create a self-contained system enclosed within a box, without the need for an external computer interface. The attached system comprises integrated components such as a Raspberry Pi, infrared-sensitive camera, infrared light-emitting diodes (LEDs), a pico projector, and an infrared laser, all powered by its own battery. This enclosed system will enable healthcare professionals to locate veins and obtain non-contact physiological parameters during important procedures such as venipuncture and intravenous medication administration.",
          output: "-",
        },
        project8: {
          involved_student: "N. Gokduman",
          budget: "4’000 Liras",
          abstract: "In this project it is aimed to provide epi-illumination to a normal student microscope to \n" +
              "obtain 0.46X magnified epifluorescence images at 1920×1080 resolution via mountable \n" +
              "device. The main purpose by doing this project is to be able to obtain epifluorescence \n" +
              "imaging with a much lower cost and more flexible than a standard fluorescence microscope \n" +
              "since, most of the projects are done by changing the optical and mechanical components of \n" +
              "the current microscope. By doing this project, the usage of epifluorescence microscope can \n" +
              "be increased and make them more accessible for the scientific education, schools and \n" +
              "research institutes. \n" +
              "Epifluorescence microscopy enables imaging of the tissues, living cells, and even organelles \n" +
              "via illumination by excitation of the fluorescence probes at a specific wavelength.\n" +
              "In epifluorescence microscopy, the high contrast and specifying of the images produced has \n" +
              "allowed for the increased understanding of cell structures, the location and dynamics of \n" +
              "gene expression and distinct interactions at a molecular level within the cell.\n" +
              "Fluorescence microscopy has become an essential tool for research and education in \n" +
              "biological sciences. Unfortunately, fluorescence microscopy is expensive and its software has \n" +
              "limited access which restricts its usage area outside academic labs and wealthy research \n" +
              "institutions. Hence, for lower cost, more efficient and ease of use, it is better to build the \n" +
              "equipment by yourself. For this purpose, open source libraries, software, easy to use \n" +
              "microcontrollers, off-the-shelf electronics and 3D printers can be used to build the desired \n" +
              "instrumentations [2,5,1]. These options have facilitated the development of inexpensive \n" +
              "scientific devices and laboratory equipment and can reduce costs by 90–99%. This not only \n" +
              "facilitates reproducibility of experimental results across labs, but also promotes rapid \n" +
              "iteration and prototyping of novel modifications to adapt the basic design for a wide range\n" +
              "of specialized applications [8,9].",
          output: "Gökduman, S. N. (2020, November). Epifluorescnce Imaging on a Student Microscope. In 2020 12th International Conference on Electrical and Electronics Engineering (ELECO) (pp. 140-144). IEEE.",
        },
      };

      projectBoxes.forEach(box => {
        box.addEventListener("click", () => {
          const projectData = getProjectData(box.dataset.project);
          populateModalContent(projectData);
          modalOverlay.style.display = "flex";
        });
      });

      closeModal.addEventListener("click", () => {
        modalOverlay.style.display = "none";
      });

      modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
          modalOverlay.style.display = "none";
        }
      });

function populateModalContent(data) {
  let content = '';

  if (data.team) {
    content += `<p style="text-align: left"><strong>Team:</strong><br>${data.team}</p>`;
  }

  if (data.involved_student) {
    content += `<p style="text-align: left"><strong>Involved Student:</strong><br>${data.involved_student}</p>`;
  }

  if (data.budget) {
    content += `<p style="text-align: left"><strong>Budget:</strong><br>${data.budget}</p>`;
  }

  if (data.abstract) {
    content += `<p style="text-align: left"><strong>Abstract:</strong><br>${data.abstract}</p>`;
  }

  if (data.output) {
    content += `
      <div class="output-section">
        <strong>Output:</strong>
        ${createOutputList(data.output)}
      </div>`;
  }

  modalContent.innerHTML = content;
}


function createOutputList(output) {
  const outputItems = output.split('\n').filter(item => item.trim() !== '');

  if (outputItems.length === 0) {
    return '<p>No output information available.</p>';
  }

  const listType = outputItems.length >= 1 ? 'ul' : 'ol';

  const outputListItems = outputItems.map(item => `<li>${item}</li>`).join('');

  return `<${listType}>${outputListItems}</${listType}>`;
}
      function getProjectData(projectId) {
        return projects[projectId];
      }
    });


//for top menu
   var circle = document.getElementById("circle");
  var upBtn = document.getElementById("upBtn");
  var downBtn = document.getElementById("downBtn");

  var rotationAngle = 0;

  upBtn.onclick = function () {
    rotationAngle -= 90;
    circle.style.transform = `rotate(${rotationAngle}deg)`;
  };

  downBtn.onclick = function () {
    rotationAngle += 90;
    circle.style.transform = `rotate(${rotationAngle}deg)`;
  };



//people
function showDetails(memberId) {
    const modal = document.getElementById(memberId);
    modal.style.display = "block";

    // Find the close button inside the modal
    const closeButton = modal.querySelector(".close-button");

    // Add a click event listener to the close button
    closeButton.addEventListener("click", function () {
        modal.style.display = "none";
    });
}









