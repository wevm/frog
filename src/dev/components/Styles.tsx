export function Styles() {
  const colors = `
    :root {
      --gray-100-value:0,0%,10%;
      --gray-200-value:0,0%,12%;
      --gray-300-value:0,0%,16%;
      --gray-400-value:0,0%,18%;
      --gray-500-value:0,0%,27%;
      --gray-600-value:0,0%,53%;
      --gray-700-value:0,0%,56%;
      --gray-800-value:0,0%,49%;
      --gray-900-value:0,0%,63%;
      --gray-1000-value:0,0%,93%;
      --blue-100-value:216,50%,12%;
      --blue-200-value:214,59%,15%;
      --blue-300-value:213,71%,20%;
      --blue-400-value:212,78%,23%;
      --blue-500-value:211,86%,27%;
      --blue-600-value:206,100%,50%;
      --blue-700-value:212,100%,48%;
      --blue-800-value:212,100%,41%;
      --blue-900-value:210,100%,66%;
      --blue-1000-value:206,100%,96%;
      --red-100-value:357,37%,12%;
      --red-200-value:357,46%,16%;
      --red-300-value:356,54%,22%;
      --red-400-value:357,55%,26%;
      --red-500-value:357,60%,32%;
      --red-600-value:358,75%,59%;
      --red-700-value:358,75%,59%;
      --red-800-value:358,69%,52%;
      --red-900-value:358,100%,69%;
      --red-1000-value:353,90%,96%;
      --amber-100-value:35,100%,8%;
      --amber-200-value:32,100%,10%;
      --amber-300-value:33,100%,15%;
      --amber-400-value:35,100%,17%;
      --amber-500-value:35,91%,22%;
      --amber-600-value:39,85%,49%;
      --amber-700-value:39,100%,57%;
      --amber-800-value:35,100%,52%;
      --amber-900-value:35,100%,52%;
      --amber-1000-value:40,94%,93%;
      --green-100-value:136,50%,9%;
      --green-200-value:137,50%,12%;
      --green-300-value:136,50%,14%;
      --green-400-value:135,70%,16%;
      --green-500-value:135,70%,23%;
      --green-600-value:135,70%,34%;
      --green-700-value:131,41%,46%;
      --green-800-value:132,43%,39%;
      --green-900-value:131,43%,57%;
      --green-1000-value:136,73%,94%;
      --teal-100-value:169,78%,7%;
      --teal-200-value:170,74%,9%;
      --teal-300-value:171,75%,13%;
      --teal-400-value:171,85%,13%;
      --teal-500-value:172,85%,20%;
      --teal-600-value:172,85%,32%;
      --teal-700-value:173,80%,36%;
      --teal-800-value:173,83%,30%;
      --teal-900-value:174,90%,41%;
      --teal-1000-value:166,71%,93%;
      --purple-100-value:283,30%,12%;
      --purple-200-value:281,38%,16%;
      --purple-300-value:279,44%,23%;
      --purple-400-value:277,46%,28%;
      --purple-500-value:274,49%,35%;
      --purple-600-value:272,51%,54%;
      --purple-700-value:272,51%,54%;
      --purple-800-value:272,47%,45%;
      --purple-900-value:275,80%,71%;
      --purple-1000-value:281,73%,96%;
      --pink-100-value:335,32%,12%;
      --pink-200-value:335,43%,16%;
      --pink-300-value:335,47%,21%;
      --pink-400-value:335,51%,22%;
      --pink-500-value:335,57%,27%;
      --pink-600-value:336,75%,40%;
      --pink-700-value:336,80%,58%;
      --pink-800-value:336,74%,51%;
      --pink-900-value:341,90%,67%;
      --pink-1000-value:333,90%,96%;
      --gray-alpha-100:hsla(0,0%,100%,.06);
      --gray-alpha-200:hsla(0,0%,100%,.09);
      --gray-alpha-300:hsla(0,0%,100%,.13);
      --gray-alpha-400:hsla(0,0%,100%,.14);
      --gray-alpha-500:hsla(0,0%,100%,.24);
      --gray-alpha-600:hsla(0,0%,100%,.51);
      --gray-alpha-700:hsla(0,0%,100%,.54);
      --gray-alpha-800:hsla(0,0%,100%,.47);
      --gray-alpha-900:hsla(0,0%,100%,.61);
      --gray-alpha-1000:hsla(0,0%,100%,.92);
      --background-100:#0a0a0a;
      --background-200:#000;
      --focus-border:0 0 0 1px var(--gray-alpha-300),0px 0px 0px 2px hsla(var(--blue-900-value),0.75);
      --focus-color:var(--blue-900);

      --gray-100:hsla(var(--gray-100-value),1);
      --gray-200:hsla(var(--gray-200-value),1);
      --gray-300:hsla(var(--gray-300-value),1);
      --gray-400:hsla(var(--gray-400-value),1);
      --gray-500:hsla(var(--gray-500-value),1);
      --gray-600:hsla(var(--gray-600-value),1);
      --gray-700:hsla(var(--gray-700-value),1);
      --gray-800:hsla(var(--gray-800-value),1);
      --gray-900:hsla(var(--gray-900-value),1);
      --gray-1000:hsla(var(--gray-1000-value),1);
      --blue-100:hsla(var(--blue-100-value),1);
      --blue-200:hsla(var(--blue-200-value),1);
      --blue-300:hsla(var(--blue-300-value),1);
      --blue-400:hsla(var(--blue-400-value),1);
      --blue-500:hsla(var(--blue-500-value),1);
      --blue-600:hsla(var(--blue-600-value),1);
      --blue-700:hsla(var(--blue-700-value),1);
      --blue-800:hsla(var(--blue-800-value),1);
      --blue-900:hsla(var(--blue-900-value),1);
      --blue-1000:hsla(var(--blue-1000-value),1);
      --amber-100:hsla(var(--amber-100-value),1);
      --amber-200:hsla(var(--amber-200-value),1);
      --amber-300:hsla(var(--amber-300-value),1);
      --amber-400:hsla(var(--amber-400-value),1);
      --amber-500:hsla(var(--amber-500-value),1);
      --amber-600:hsla(var(--amber-600-value),1);
      --amber-700:hsla(var(--amber-700-value),1);
      --amber-800:hsla(var(--amber-800-value),1);
      --amber-900:hsla(var(--amber-900-value),1);
      --amber-1000:hsla(var(--amber-1000-value),1);
      --red-100:hsla(var(--red-100-value),1);
      --red-200:hsla(var(--red-200-value),1);
      --red-300:hsla(var(--red-300-value),1);
      --red-400:hsla(var(--red-400-value),1);
      --red-500:hsla(var(--red-500-value),1);
      --red-600:hsla(var(--red-600-value),1);
      --red-700:hsla(var(--red-700-value),1);
      --red-800:hsla(var(--red-800-value),1);
      --red-900:hsla(var(--red-900-value),1);
      --red-1000:hsla(var(--red-1000-value),1);
      --green-100:hsla(var(--green-100-value),1);
      --green-200:hsla(var(--green-200-value),1);
      --green-300:hsla(var(--green-300-value),1);
      --green-400:hsla(var(--green-400-value),1);
      --green-500:hsla(var(--green-500-value),1);
      --green-600:hsla(var(--green-600-value),1);
      --green-700:hsla(var(--green-700-value),1);
      --green-800:hsla(var(--green-800-value),1);
      --green-900:hsla(var(--green-900-value),1);
      --green-1000:hsla(var(--green-1000-value),1);
      --teal-100:hsla(var(--teal-100-value),1);
      --teal-200:hsla(var(--teal-200-value),1);
      --teal-300:hsla(var(--teal-300-value),1);
      --teal-400:hsla(var(--teal-400-value),1);
      --teal-500:hsla(var(--teal-500-value),1);
      --teal-600:hsla(var(--teal-600-value),1);
      --teal-700:hsla(var(--teal-700-value),1);
      --teal-800:hsla(var(--teal-800-value),1);
      --teal-900:hsla(var(--teal-900-value),1);
      --teal-1000:hsla(var(--teal-1000-value),1);
      --purple-100:hsla(var(--purple-100-value),1);
      --purple-200:hsla(var(--purple-200-value),1);
      --purple-300:hsla(var(--purple-300-value),1);
      --purple-400:hsla(var(--purple-400-value),1);
      --purple-500:hsla(var(--purple-500-value),1);
      --purple-600:hsla(var(--purple-600-value),1);
      --purple-700:hsla(var(--purple-700-value),1);
      --purple-800:hsla(var(--purple-800-value),1);
      --purple-900:hsla(var(--purple-900-value),1);
      --purple-1000:hsla(var(--purple-1000-value),1);
      --pink-100:hsla(var(--pink-100-value),1);
      --pink-200:hsla(var(--pink-200-value),1);
      --pink-300:hsla(var(--pink-300-value),1);
      --pink-400:hsla(var(--pink-400-value),1);
      --pink-500:hsla(var(--pink-500-value),1);
      --pink-600:hsla(var(--pink-600-value),1);
      --pink-700:hsla(var(--pink-700-value),1);
      --pink-800:hsla(var(--pink-800-value),1);
      --pink-900:hsla(var(--pink-900-value),1);
      --pink-1000:hsla(var(--pink-1000-value),1)
    }

    @media (prefers-color-scheme: light) {
      :root {
        --gray-100-value:0,0%,95%;
        --gray-200-value:0,0%,92%;
        --gray-300-value:0,0%,90%;
        --gray-400-value:0,0%,92%;
        --gray-500-value:0,0%,79%;
        --gray-600-value:0,0%,66%;
        --gray-700-value:0,0%,56%;
        --gray-800-value:0,0%,49%;
        --gray-900-value:0,0%,40%;
        --gray-1000-value:0,0%,9%;
        --blue-100-value:212,100%,97%;
        --blue-200-value:210,100%,96%;
        --blue-300-value:210,100%,94%;
        --blue-400-value:209,100%,90%;
        --blue-500-value:209,100%,80%;
        --blue-600-value:208,100%,66%;
        --blue-700-value:212,100%,48%;
        --blue-800-value:212,100%,41%;
        --blue-900-value:211,100%,42%;
        --blue-1000-value:211,100%,15%;
        --red-100-value:0,100%,97%;
        --red-200-value:0,100%,96%;
        --red-300-value:0,100%,95%;
        --red-400-value:0,90%,92%;
        --red-500-value:0,82%,85%;
        --red-600-value:359,90%,71%;
        --red-700-value:358,75%,59%;
        --red-800-value:358,70%,52%;
        --red-900-value:358,66%,48%;
        --red-1000-value:355,49%,15%;
        --amber-100-value:39,100%,95%;
        --amber-200-value:44,100%,92%;
        --amber-300-value:43,96%,90%;
        --amber-400-value:42,100%,78%;
        --amber-500-value:38,100%,71%;
        --amber-600-value:36,90%,62%;
        --amber-700-value:39,100%,57%;
        --amber-800-value:35,100%,52%;
        --amber-900-value:30,100%,32%;
        --amber-1000-value:20,79%,17%;
        --green-100-value:120,60%,96%;
        --green-200-value:120,60%,95%;
        --green-300-value:120,60%,91%;
        --green-400-value:122,60%,86%;
        --green-500-value:124,60%,75%;
        --green-600-value:125,60%,64%;
        --green-700-value:131,41%,46%;
        --green-800-value:132,43%,39%;
        --green-900-value:133,50%,32%;
        --green-1000-value:128,29%,15%;
        --teal-100-value:169,70%,96%;
        --teal-200-value:167,70%,94%;
        --teal-300-value:168,70%,90%;
        --teal-400-value:170,70%,85%;
        --teal-500-value:170,70%,72%;
        --teal-600-value:170,70%,57%;
        --teal-700-value:173,80%,36%;
        --teal-800-value:173,83%,30%;
        --teal-900-value:174,91%,25%;
        --teal-1000-value:171,80%,13%;
        --purple-100-value:276,100%,97%;
        --purple-200-value:277,87%,97%;
        --purple-300-value:274,78%,95%;
        --purple-400-value:276,71%,92%;
        --purple-500-value:274,70%,82%;
        --purple-600-value:273,72%,73%;
        --purple-700-value:272,51%,54%;
        --purple-800-value:272,47%,45%;
        --purple-900-value:274,71%,43%;
        --purple-1000-value:276,100%,15%;
        --pink-100-value:330,100%,96%;
        --pink-200-value:340,90%,96%;
        --pink-300-value:340,82%,94%;
        --pink-400-value:341,76%,91%;
        --pink-500-value:340,75%,84%;
        --pink-600-value:341,75%,73%;
        --pink-700-value:336,80%,58%;
        --pink-800-value:336,74%,51%;
        --pink-900-value:336,65%,45%;
        --pink-1000-value:333,74%,15%;
        --gray-alpha-100:rgba(0,0,0,.05);
        --gray-alpha-200:rgba(0,0,0,.08);
        --gray-alpha-300:rgba(0,0,0,.1);
        --gray-alpha-400:rgba(0,0,0,.08);
        --gray-alpha-500:rgba(0,0,0,.21);
        --gray-alpha-600:rgba(0,0,0,.34);
        --gray-alpha-700:rgba(0,0,0,.44);
        --gray-alpha-800:rgba(0,0,0,.51);
        --gray-alpha-900:rgba(0,0,0,.61);
        --gray-alpha-1000:rgba(0,0,0,.91);
        --background-100:#fff;
        --background-200:#fafafa;
        --focus-border:0 0 0 1px var(--gray-alpha-600),0px 0px 0px 2px hsla(var(--blue-700-value),0.75);
        --focus-color:var(--blue-700);
      }
    }

    .bg-gray-100 { background-color: var(--gray-100); }
    .bg-gray-200 { background-color: var(--gray-200); }
    .bg-gray-300 { background-color: var(--gray-300); }
    .bg-gray-400 { background-color: var(--gray-400); }
    .bg-gray-500 { background-color: var(--gray-500); }
    .bg-gray-600 { background-color: var(--gray-600); }
    .bg-gray-700 { background-color: var(--gray-700); }
    .bg-gray-800 { background-color: var(--gray-800); }
    .bg-gray-900 { background-color: var(--gray-900); }
    .bg-gray-1000 { background-color: var(--gray-1000); }
    .bg-blue-100 { background-color: var(--blue-100); }
    .bg-blue-200 { background-color: var(--blue-200); }
    .bg-blue-300 { background-color: var(--blue-300); }
    .bg-blue-400 { background-color: var(--blue-400); }
    .bg-blue-500 { background-color: var(--blue-500); }
    .bg-blue-600 { background-color: var(--blue-600); }
    .bg-blue-700 { background-color: var(--blue-700); }
    .bg-blue-800 { background-color: var(--blue-800); }
    .bg-blue-900 { background-color: var(--blue-900); }
    .bg-blue-1000 { background-color: var(--blue-1000); }
    .bg-amber-100 { background-color: var(--amber-100); }
    .bg-amber-200 { background-color: var(--amber-200); }
    .bg-amber-300 { background-color: var(--amber-300); }
    .bg-amber-400 { background-color: var(--amber-400); }
    .bg-amber-500 { background-color: var(--amber-500); }
    .bg-amber-600 { background-color: var(--amber-600); }
    .bg-amber-700 { background-color: var(--amber-700); }
    .bg-amber-800 { background-color: var(--amber-800); }
    .bg-amber-900 { background-color: var(--amber-900); }
    .bg-amber-1000 { background-color: var(--amber-1000); }
    .bg-red-100 { background-color: var(--red-100); }
    .bg-red-200 { background-color: var(--red-200); }
    .bg-red-300 { background-color: var(--red-300); }
    .bg-red-400 { background-color: var(--red-400); }
    .bg-red-500 { background-color: var(--red-500); }
    .bg-red-600 { background-color: var(--red-600); }
    .bg-red-700 { background-color: var(--red-700); }
    .bg-red-800 { background-color: var(--red-800); }
    .bg-red-900 { background-color: var(--red-900); }
    .bg-red-1000 { background-color: var(--red-1000); }
    .bg-green-100 { background-color: var(--green-100); }
    .bg-green-200 { background-color: var(--green-200); }
    .bg-green-300 { background-color: var(--green-300); }
    .bg-green-400 { background-color: var(--green-400); }
    .bg-green-500 { background-color: var(--green-500); }
    .bg-green-600 { background-color: var(--green-600); }
    .bg-green-700 { background-color: var(--green-700); }
    .bg-green-800 { background-color: var(--green-800); }
    .bg-green-900 { background-color: var(--green-900); }
    .bg-green-1000 { background-color: var(--green-1000); }
    .bg-teal-100 { background-color: var(--teal-100); }
    .bg-teal-200 { background-color: var(--teal-200); }
    .bg-teal-300 { background-color: var(--teal-300); }
    .bg-teal-400 { background-color: var(--teal-400); }
    .bg-teal-500 { background-color: var(--teal-500); }
    .bg-teal-600 { background-color: var(--teal-600); }
    .bg-teal-700 { background-color: var(--teal-700); }
    .bg-teal-800 { background-color: var(--teal-800); }
    .bg-teal-900 { background-color: var(--teal-900); }
    .bg-teal-1000 { background-color: var(--teal-1000); }
    .bg-purple-100 { background-color: var(--purple-100); }
    .bg-purple-200 { background-color: var(--purple-200); }
    .bg-purple-300 { background-color: var(--purple-300); }
    .bg-purple-400 { background-color: var(--purple-400); }
    .bg-purple-500 { background-color: var(--purple-500); }
    .bg-purple-600 { background-color: var(--purple-600); }
    .bg-purple-700 { background-color: var(--purple-700); }
    .bg-purple-800 { background-color: var(--purple-800); }
    .bg-purple-900 { background-color: var(--purple-900); }
    .bg-purple-1000 { background-color: var(--purple-1000); }
    .bg-pink-100 { background-color: var(--pink-100); }
    .bg-pink-200 { background-color: var(--pink-200); }
    .bg-pink-300 { background-color: var(--pink-300); }
    .bg-pink-400 { background-color: var(--pink-400); }
    .bg-pink-500 { background-color: var(--pink-500); }
    .bg-pink-600 { background-color: var(--pink-600); }
    .bg-pink-700 { background-color: var(--pink-700); }
    .bg-pink-800 { background-color: var(--pink-800); }
    .bg-pink-900 { background-color: var(--pink-900); }
    .bg-pink-1000 { background-color: var(--pink-1000); }
    .bg-gray-alpha-100 { background-color: var(--gray-alpha-100); }
    .bg-gray-alpha-200 { background-color: var(--gray-alpha-200); }
    .bg-gray-alpha-300 { background-color: var(--gray-alpha-300); }
    .bg-gray-alpha-400 { background-color: var(--gray-alpha-400); }
    .bg-gray-alpha-500 { background-color: var(--gray-alpha-500); }
    .bg-gray-alpha-600 { background-color: var(--gray-alpha-600); }
    .bg-gray-alpha-700 { background-color: var(--gray-alpha-700); }
    .bg-gray-alpha-800 { background-color: var(--gray-alpha-800); }
    .bg-gray-alpha-900 { background-color: var(--gray-alpha-900); }
    .bg-gray-alpha-1000 { background-color: var(--gray-alpha-1000); }
    .bg-background-100 { background-color: var(--background-100); }
    .bg-background-200 { background-color: var(--background-200); }

    .border-gray-100 { border-color: var(--gray-100) !important; }
    .border-gray-200 { border-color: var(--gray-200) !important; }
    .border-gray-300 { border-color: var(--gray-300) !important; }
    .border-gray-400 { border-color: var(--gray-400) !important; }
    .border-gray-500 { border-color: var(--gray-500) !important; }
    .border-gray-600 { border-color: var(--gray-600) !important; }
    .border-gray-700 { border-color: var(--gray-700) !important; }
    .border-gray-800 { border-color: var(--gray-800) !important; }
    .border-gray-900 { border-color: var(--gray-900) !important; }
    .border-gray-1000 { border-color: var(--gray-1000) !important; }
    .border-blue-100 { border-color: var(--blue-100) !important; }
    .border-blue-200 { border-color: var(--blue-200) !important; }
    .border-blue-300 { border-color: var(--blue-300) !important; }
    .border-blue-400 { border-color: var(--blue-400) !important; }
    .border-blue-500 { border-color: var(--blue-500) !important; }
    .border-blue-600 { border-color: var(--blue-600) !important; }
    .border-blue-700 { border-color: var(--blue-700) !important; }
    .border-blue-800 { border-color: var(--blue-800) !important; }
    .border-blue-900 { border-color: var(--blue-900) !important; }
    .border-blue-1000 { border-color: var(--blue-1000) !important; }
    .border-amber-100 { border-color: var(--amber-100) !important; }
    .border-amber-200 { border-color: var(--amber-200) !important; }
    .border-amber-300 { border-color: var(--amber-300) !important; }
    .border-amber-400 { border-color: var(--amber-400) !important; }
    .border-amber-500 { border-color: var(--amber-500) !important; }
    .border-amber-600 { border-color: var(--amber-600) !important; }
    .border-amber-700 { border-color: var(--amber-700) !important; }
    .border-amber-800 { border-color: var(--amber-800) !important; }
    .border-amber-900 { border-color: var(--amber-900) !important; }
    .border-amber-1000 { border-color: var(--amber-1000) !important; }
    .border-red-100 { border-color: var(--red-100) !important; }
    .border-red-200 { border-color: var(--red-200) !important; }
    .border-red-300 { border-color: var(--red-300) !important; }
    .border-red-400 { border-color: var(--red-400) !important; }
    .border-red-500 { border-color: var(--red-500) !important; }
    .border-red-600 { border-color: var(--red-600) !important; }
    .border-red-700 { border-color: var(--red-700) !important; }
    .border-red-800 { border-color: var(--red-800) !important; }
    .border-red-900 { border-color: var(--red-900) !important; }
    .border-red-1000 { border-color: var(--red-1000) !important; }
    .border-green-100 { border-color: var(--green-100) !important; }
    .border-green-200 { border-color: var(--green-200) !important; }
    .border-green-300 { border-color: var(--green-300) !important; }
    .border-green-400 { border-color: var(--green-400) !important; }
    .border-green-500 { border-color: var(--green-500) !important; }
    .border-green-600 { border-color: var(--green-600) !important; }
    .border-green-700 { border-color: var(--green-700) !important; }
    .border-green-800 { border-color: var(--green-800) !important; }
    .border-green-900 { border-color: var(--green-900) !important; }
    .border-green-1000 { border-color: var(--green-1000) !important; }
    .border-teal-100 { border-color: var(--teal-100) !important; }
    .border-teal-200 { border-color: var(--teal-200) !important; }
    .border-teal-300 { border-color: var(--teal-300) !important; }
    .border-teal-400 { border-color: var(--teal-400) !important; }
    .border-teal-500 { border-color: var(--teal-500) !important; }
    .border-teal-600 { border-color: var(--teal-600) !important; }
    .border-teal-700 { border-color: var(--teal-700) !important; }
    .border-teal-800 { border-color: var(--teal-800) !important; }
    .border-teal-900 { border-color: var(--teal-900) !important; }
    .border-teal-1000 { border-color: var(--teal-1000) !important; }
    .border-purple-100 { border-color: var(--purple-100) !important; }
    .border-purple-200 { border-color: var(--purple-200) !important; }
    .border-purple-300 { border-color: var(--purple-300) !important; }
    .border-purple-400 { border-color: var(--purple-400) !important; }
    .border-purple-500 { border-color: var(--purple-500) !important; }
    .border-purple-600 { border-color: var(--purple-600) !important; }
    .border-purple-700 { border-color: var(--purple-700) !important; }
    .border-purple-800 { border-color: var(--purple-800) !important; }
    .border-purple-900 { border-color: var(--purple-900) !important; }
    .border-purple-1000 { border-color: var(--purple-1000) !important; }
    .border-pink-100 { border-color: var(--pink-100) !important; }
    .border-pink-200 { border-color: var(--pink-200) !important; }
    .border-pink-300 { border-color: var(--pink-300) !important; }
    .border-pink-400 { border-color: var(--pink-400) !important; }
    .border-pink-500 { border-color: var(--pink-500) !important; }
    .border-pink-600 { border-color: var(--pink-600) !important; }
    .border-pink-700 { border-color: var(--pink-700) !important; }
    .border-pink-800 { border-color: var(--pink-800) !important; }
    .border-pink-900 { border-color: var(--pink-900) !important; }
    .border-pink-1000 { border-color: var(--pink-1000) !important; }
    .border-gray-alpha-100 { border-color: var(--gray-alpha-100) !important; }
    .border-gray-alpha-200 { border-color: var(--gray-alpha-200) !important; }
    .border-gray-alpha-300 { border-color: var(--gray-alpha-300) !important; }
    .border-gray-alpha-400 { border-color: var(--gray-alpha-400) !important; }
    .border-gray-alpha-500 { border-color: var(--gray-alpha-500) !important; }
    .border-gray-alpha-600 { border-color: var(--gray-alpha-600) !important; }
    .border-gray-alpha-700 { border-color: var(--gray-alpha-700) !important; }
    .border-gray-alpha-800 { border-color: var(--gray-alpha-800) !important; }
    .border-gray-alpha-900 { border-color: var(--gray-alpha-900) !important; }
    .border-gray-alpha-1000 { border-color: var(--gray-alpha-1000) !important; }
    .border-background-100 { border-color: var(--background-100) !important; }
    .border-background-200 { border-color: var(--background-200) !important; }

    .text-gray-100 { color: var(--gray-100); }
    .text-gray-200 { color: var(--gray-200); }
    .text-gray-300 { color: var(--gray-300); }
    .text-gray-400 { color: var(--gray-400); }
    .text-gray-500 { color: var(--gray-500); }
    .text-gray-600 { color: var(--gray-600); }
    .text-gray-700 { color: var(--gray-700); }
    .text-gray-800 { color: var(--gray-800); }
    .text-gray-900 { color: var(--gray-900); }
    .text-gray-1000 { color: var(--gray-1000); }
    .text-blue-100 { color: var(--blue-100); }
    .text-blue-200 { color: var(--blue-200); }
    .text-blue-300 { color: var(--blue-300); }
    .text-blue-400 { color: var(--blue-400); }
    .text-blue-500 { color: var(--blue-500); }
    .text-blue-600 { color: var(--blue-600); }
    .text-blue-700 { color: var(--blue-700); }
    .text-blue-800 { color: var(--blue-800); }
    .text-blue-900 { color: var(--blue-900); }
    .text-blue-1000 { color: var(--blue-1000); }
    .text-amber-100 { color: var(--amber-100); }
    .text-amber-200 { color: var(--amber-200); }
    .text-amber-300 { color: var(--amber-300); }
    .text-amber-400 { color: var(--amber-400); }
    .text-amber-500 { color: var(--amber-500); }
    .text-amber-600 { color: var(--amber-600); }
    .text-amber-700 { color: var(--amber-700); }
    .text-amber-800 { color: var(--amber-800); }
    .text-amber-900 { color: var(--amber-900); }
    .text-amber-1000 { color: var(--amber-1000); }
    .text-red-100 { color: var(--red-100); }
    .text-red-200 { color: var(--red-200); }
    .text-red-300 { color: var(--red-300); }
    .text-red-400 { color: var(--red-400); }
    .text-red-500 { color: var(--red-500); }
    .text-red-600 { color: var(--red-600); }
    .text-red-700 { color: var(--red-700); }
    .text-red-800 { color: var(--red-800); }
    .text-red-900 { color: var(--red-900); }
    .text-red-1000 { color: var(--red-1000); }
    .text-green-100 { color: var(--green-100); }
    .text-green-200 { color: var(--green-200); }
    .text-green-300 { color: var(--green-300); }
    .text-green-400 { color: var(--green-400); }
    .text-green-500 { color: var(--green-500); }
    .text-green-600 { color: var(--green-600); }
    .text-green-700 { color: var(--green-700); }
    .text-green-800 { color: var(--green-800); }
    .text-green-900 { color: var(--green-900); }
    .text-green-1000 { color: var(--green-1000); }
    .text-teal-100 { color: var(--teal-100); }
    .text-teal-200 { color: var(--teal-200); }
    .text-teal-300 { color: var(--teal-300); }
    .text-teal-400 { color: var(--teal-400); }
    .text-teal-500 { color: var(--teal-500); }
    .text-teal-600 { color: var(--teal-600); }
    .text-teal-700 { color: var(--teal-700); }
    .text-teal-800 { color: var(--teal-800); }
    .text-teal-900 { color: var(--teal-900); }
    .text-teal-1000 { color: var(--teal-1000); }
    .text-purple-100 { color: var(--purple-100); }
    .text-purple-200 { color: var(--purple-200); }
    .text-purple-300 { color: var(--purple-300); }
    .text-purple-400 { color: var(--purple-400); }
    .text-purple-500 { color: var(--purple-500); }
    .text-purple-600 { color: var(--purple-600); }
    .text-purple-700 { color: var(--purple-700); }
    .text-purple-800 { color: var(--purple-800); }
    .text-purple-900 { color: var(--purple-900); }
    .text-purple-1000 { color: var(--purple-1000); }
    .text-pink-100 { color: var(--pink-100); }
    .text-pink-200 { color: var(--pink-200); }
    .text-pink-300 { color: var(--pink-300); }
    .text-pink-400 { color: var(--pink-400); }
    .text-pink-500 { color: var(--pink-500); }
    .text-pink-600 { color: var(--pink-600); }
    .text-pink-700 { color: var(--pink-700); }
    .text-pink-800 { color: var(--pink-800); }
    .text-pink-900 { color: var(--pink-900); }
    .text-pink-1000 { color: var(--pink-1000); }
    .text-gray-alpha-100 { color: var(--gray-alpha-100); }
    .text-gray-alpha-200 { color: var(--gray-alpha-200); }
    .text-gray-alpha-300 { color: var(--gray-alpha-300); }
    .text-gray-alpha-400 { color: var(--gray-alpha-400); }
    .text-gray-alpha-500 { color: var(--gray-alpha-500); }
    .text-gray-alpha-600 { color: var(--gray-alpha-600); }
    .text-gray-alpha-700 { color: var(--gray-alpha-700); }
    .text-gray-alpha-800 { color: var(--gray-alpha-800); }
    .text-gray-alpha-900 { color: var(--gray-alpha-900); }
    .text-gray-alpha-1000 { color: var(--gray-alpha-1000); }
    .text-background-100 { color: var(--background-100); }
    .text-background-200 { color: var(--background-200); }
  `
  const styles = `
    ${colors}

    :root {
      --page-margin: 1rem;
      --page-width: 93rem;
      --page-width-with-margin: calc(var(--page-width) + calc(2 * var(--page-margin)));

      color-scheme: dark;
      font-family: Inter, arial, sans-serif;
      font-feature-settings: 'liga' 1, 'calt' 1; /* fix for Chrome */
    }

    @media (prefers-color-scheme: light) {
      :root {
        color-scheme: light;
      }
    }

    @supports (font-variation-settings: normal) {
      :root { font-family: InterVariable, arial, sans-serif; }
    }

    *,
    ::before,
    ::after {
      box-sizing: border-box;
      border-width: 0;
      border-style: solid;
      border-color: var(--gray-200);
    }

    ::selection {
      background-color: var(--blue-700);
      color: var(--gray-1000);
    }

    html {
      background-color: var(--background-200);
      color: var(--gray-1000);
      font-synthesis: none;
      font-weight: 400;
      font-size: 16px;
      line-height: 1.5;
      scrollbar-color: var(--gray-alpha-500) transparent;
      scrollbar-width: thin;
      scrollbar-gutter: stable;
      text-rendering: optimizeLegibility;

      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      -webkit-text-size-adjust: 100%;
    }

    a {
      color: inherit;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
      text-decoration-skip-ink: auto;
    }

    body {
      height: 100vh;
      margin: 0;
      line-height: inherit;
    }
    
    a:focus-visible,
    button:focus-visible,
    dialog:focus-visible,
    div:focus-visible,
    input:focus-visible,
    pre:focus-visible {
      box-shadow: var(--focus-border);
      outline: none;
      isolation: isolate;
    }

    h1, p { margin: 0; }

    pre {
      margin: 0;
      background: transparent !important;

      --shiki-foreground: var(--gray-500);
      --shiki-background: var(--background-100);
      --shiki-token-constant: var(--gray-1000);
      --shiki-token-string: var(--gray-700);
      --shiki-token-comment: var(--gray-700);
      --shiki-token-keyword: var(--gray-700);
      --shiki-token-parameter: var(--gray-700);
      --shiki-token-function: var(--gray-700);
      --shiki-token-string-expression: var(--gray-1000);
      --shiki-token-punctuation: var(--gray-700);
      --shiki-token-link: var(--gray-700);
    }

    ul { margin: 0; padding: 0; }
    li { list-style: none; }

    /** Reset **/

    button,
    input {
      font-family: inherit; 
      font-feature-settings: inherit;
      font-variation-settings: inherit;
      font-size: 100%;
      font-weight: inherit;
      line-height: inherit;
      color: inherit;
      margin: 0;
      padding: 0;
    }

    table {
      text-indent: 0;
      border-color: inherit;
      border-collapse: collapse;
    }

    button,
    input {
      font-family: inherit;
      font-feature-settings: inherit;
      font-variation-settings: inherit;
      font-size: 100%;
      font-weight: inherit;
      line-height: inherit;
      color: inherit;
      margin: 0;
      padding: 0;
    }

    button {
      cursor: pointer;
      text-transform: none;
    }

    button[type='submit'] {
      -webkit-appearance: button;
      background-image: none;
    }

    :-moz-focusring {
      outline: auto;
    }

    input::placeholder {
      opacity: 1;
      color: var(--gray-700);
    }

    :disabled {
      cursor: default;
    }

    img,
    svg,
    video {
      display: block;
      vertical-align: middle;
    }

    img,
    video {
      max-width: 100%;
      height: auto;
    }

    [hidden] {
      display: none;
    }

    /** Utilities **/

    .absolute { position: absolute; }
    .border { border-width: 1px; }
    .border-t { border-top-width: 1px; }
    .border-t-0 { border-top-width: 0; }
    .cursor-pointer { cursor: pointer; }
    .display-block { display: block; }
    .font-normal { font-weight: 400; }
    .font-medium { font-weight: 500; }
    .font-semibold { font-weight: 600; }
    .font-bold { font-weight: 700; }
    .font-mono { font-family: "Roboto Mono",Menlo,Monaco,Lucida Console,Liberation Mono,DejaVu Sans Mono,Bitstream Vera Sans Mono,Courier New,monospace; }
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .flex-row { flex-direction: row; }
    .flex-wrap { flex-wrap: wrap; }
    .gap-0\\.5 { gap: 0.125rem; }
    .gap-1 { gap: 0.25rem; }
    .gap-1\\.5 { gap: 0.375rem; }
    .gap-2 { gap: 0.5rem; }
    .gap-2\\.5 { gap: 0.625rem; }
    .gap-3 { gap: 0.75rem; }
    .gap-4 { gap: 1rem; }
    .gap-6 { gap: 1.5rem; }
    .grid { display: grid; }
    .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .h-full { height: 100%; }
    .h-10 { height: 2.5rem; }
    .inline-block { display: inline-block; }
    .items-center { align-items: center; }
    .justify-center { justify-content: center; }
    .justify-between { justify-content: space-between; }
    .leading-4 { line-height: 1rem; }
    .leading-snug { line-height: 1.375; }
    .max-w-full { max-width: 100%; }
    .min-w-36 { min-width: 9rem; }
    .mx-auto { margin-left: auto; margin-right: auto; }
    .mx-4 { margin-left: 1rem; margin-right: 1rem; }
    .mt-1 { margin-top: 0.25rem; }
    .mt-1\\.5 { margin-top: 0.375rem; }
    .object-cover { object-fit: cover; }
    .overflow-hidden { overflow: hidden; }
    .order-0 { order: 0; }
    .order-1 { order: 1; }
    .p-1 { padding: 0.25rem; }
    .p-1\\.5 { padding: 0.375rem; }
    .p-2 { padding: 0.5rem; }
    .p-3 { padding: 0.75rem; }
    .p-4 { padding: 1rem; }
    .pb-0 { padding-bottom: 0; }
    .pb-6 { padding-bottom: 1.5rem; }
    .pb-4 { padding-bottom: 1rem; }
    .px-1 { padding-left: 0.25rem; padding-right: 0.25rem; }
    .px-1\\.5 { padding-left: 0.375rem; padding-right: 0.375rem; }
    .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
    .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
    .px-4 { padding-left: 1rem; padding-right: 1rem; }
    .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
    .py-0\\.5 { padding-top: 0.125rem; padding-bottom: 0.125rem; }
    .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
    .py-1\\.5 { padding-top: 0.375rem; padding-bottom: 0.375rem; }
    .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    .py-2\\.5 { padding-top: 0.625rem; padding-bottom: 0.625rem; }
    .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
    .pr-6 { padding-right: 1.5rem; }
    .pl-6 { padding-left: 1.5rem; }
    .pb-6 { padding-bottom: 1.5rem; }
    .pt-3 { padding-top: 0.75rem; }
    .pt-6 { padding-top: 1.5rem; }
    .p-6 { padding: 1.5rem; }
    .p-8 { padding: 2rem; }
    .relative { position: relative; }
    .rounded-full { border-radius: 9999px; }
    .rounded-bl-md { border-bottom-left-radius: 0.375rem; }
    .rounded-br-md { border-bottom-right-radius: 0.375rem; }
    .rounded-lg { border-radius: 0.5rem; }
    .rounded-xl { border-radius: 0.75rem; }
    .rounded-md { border-radius: 0.375rem; }
    .rounded-b-md { border-bottom-left-radius: 0.375rem; border-bottom-right-radius: 0.375rem; }
    .rounded-t-md { border-top-left-radius: 0.375rem; border-top-right-radius: 0.375rem; } 
    .rounded-sm { border-radius: 0.25rem; }
    .rounded-r-sm { border-top-right-radius: 0.25rem; border-bottom-right-radius: 0.25rem; }
    .rounded-l-sm { border-top-left-radius: 0.25rem; border-bottom-left-radius: 0.25rem; }
    .rounded-l-md { border-top-left-radius: 0.375rem; border-bottom-left-radius: 0.375rem; }
    .rounded-r-md { border-top-right-radius: 0.375rem; border-bottom-right-radius: 0.375rem; }
    .rounded-t-lg { border-top-left-radius: 0.5rem; border-top-right-radius: 0.5rem; }
    .text-center { text-align: center; }
    .text-ellipsis { text-overflow: ellipsis; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }
    .text-base { font-size: 1rem; }
    .text-sm { font-size: 0.875rem; }
    .text-xs { font-size: 0.75rem; }
    .uppercase { text-transform: uppercase; }
    .w-min { width: min-content; }
    .w-fit { width: fit-content; }
    .w-full { width: 100%; }
    .whitespace-nowrap { white-space: nowrap; }

    .bg-transparent { background-color: transparent !important; }

    .scrollbars {
      overflow: auto;
      scrollbar-color: var(--gray-alpha-500) transparent;
      scrollbar-width: thin;
    }

    .line-clamp-2 {
      overflow: hidden;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }

    [x-cloak] { display: none !important; }

    .sr-only {
      border-width: 0;
      clip: rect(0, 0, 0, 0);
      height: 1px;
      margin: -1px;
      overflow: hidden;
      padding: 0;
      position: absolute;
      white-space: nowrap;
      width: 1px;
    }

    .divide-y > *:not(template) + *:not(template) {
      border-top-width: 1px;
      border-bottom-width: 0px;
    }
    .divide-x > *:not(template) + *:not(template) {
      border-right-width: 0;
      border-left-width: 1px;
    }
    .space-y-4 > *:not(template) + *:not(template) {
      margin-top: 1rem
    }

    .hover\\:bg-gray-100 {
      &:hover { background-color: var(--gray-100) !important; }
    }
    .hover\\:bg-red-300 {
      &:hover { background-color: var(--red-300) !important; }
    }

    .h-timeline { height: 533px }
    .container {
      padding-top: 1rem;
      padding-bottom: 1rem;
      padding-left: 1rem;
      padding-right: 1rem; /* 0.3rem when scrollbar sits in page */
    }

    .min-h-img { min-height: 269px; }

    @media screen and (min-width: 768px) {
      .md\\:flex-row {
        flex-direction: row;
      }
      .md\\:pb-0 {
        padding-bottom: 0;
      }
      .md\\:pr-0 {
        padding-right: 0;
      }
      .md\\:pb-6 {
        padding-bottom: 1.5rem;
      }
      .md\\:pr-6 { padding-right: 1.5rem; }
      .md\\:pl-6 { padding-left: 1.5rem; }
      .md\\:order-0 {
        order: 0;
      }
      .md\\:order-1 {
        order: 1;
      }
      .md\\:h-full {
        height: 100%;
      }
      .md\\:gap-6 {
        gap: 1.5rem;
      }
      .md\\:pt-6 {
        padding-top: 1.5rem;
      }
      .md\\:py-6 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
      .md\\:max-w-sidebar { max-width: 300px; }
      .md\\:min-w-sidebar { min-width: 300px; }
      .md\\:absolute { position: absolute; }
      .md\\:inset-y-0 { top: 0; bottom: 0; }

      .md\\:grid { display: grid; }
      .md\\:container {
        grid-template-areas: "a b";
        grid-template-columns: auto 1fr;
        padding-top: 1.5rem;
        padding-bottom: 1.5rem;
        padding-right: 1.5rem; /* 0.8rem when scrollbar sits in page */
        padding-left: 1.5rem;
      }
      .md\\:max-w-1\\/2 { max-width: 57%; }
      .md\\:max-w-\\[57\\%\\] { max-width: 57%; }
    }
    @media screen and (min-width: 1024px) {
      .lg\\:flex-row {
        flex-direction: row;
      }
      .lg\\:w-frame {
        width: 533.08px;
      }
      .lg\\:max-w-sidebar {
        max-width: 350px;
      }
      .lg\\:min-w-sidebar {
        min-width: 350px;
      }
      .lg\\:divide-x > *:not(template) + *:not(template) {
        border-right-width: 0;
        border-left-width: 1px;
      }
      .lg\\:divide-y-0 > *:not(template) + *:not(template)  {
        border-top-width: 0;
        border-bottom-width: 0;
      }
      .lg\\:min-h-frame { min-height: 411px; }
      .lg\\:w-1\\/2 { width: 50%; }
    }

    .dark { fill: white; }
    .light { fill: black; }
    @media (prefers-color-scheme: light) {
      .dark { fill: black; }
      .light { fill: white; }
    }
  `

  // biome-ignore lint/security/noDangerouslySetInnerHtml:
  return <style dangerouslySetInnerHTML={{ __html: styles }} />
}
