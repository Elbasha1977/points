(function(){
  function build(){
    var fields=[], answerKey={}, n=0;
    function add(section,prompt,answer,options,context){
      var id='g6e_'+(++n), f={id:id,section:section,prompt:prompt,points:1,type:options?'choice':'short_text'};
      if(options)f.options=options;if(context)f.context=context;fields.push(f);
      if(answer!==null&&answer!==undefined&&String(answer).trim())answerKey[id]=String(answer);
    }
    function text(s,q,a,c){add(s,q,a,null,c);}
    function choice(s,q,a,o,c){add(s,q,a,o,c);}
    function words(a){return a.map(function(x){return {value:x,label:x};});}
    function mcq(a,b,c,d){return [{value:'A',label:'A. '+a},{value:'B',label:'B. '+b},{value:'C',label:'C. '+c},{value:'D',label:'D. '+d}];}
    function match(s,qs,opts,ans,ctx){qs.forEach(function(q,i){choice(s,q,ans[i],opts);});}
    var m1=[{value:'a',label:'a. We must be quiet.'},{value:'b',label:"b. I've got a toothache."},{value:'c',label:'c. You should go to the dentist.'},{value:'d',label:'d. Yes, I could.'},{value:'e',label:'e. Yes, I do.'}];
    var m2=[{value:'a',label:'a. Yes, I did.'},{value:'b',label:'b. Yes, he should.'},{value:'c',label:'c. Three apples.'},{value:'d',label:'d. I was tall and slim.'},{value:'e',label:'e. OK. I like shopping.'}];
    var m3=[{value:'a',label:"a. I've got a headache."},{value:'b',label:'b. basketball'},{value:'c',label:"c. No, I couldn't."},{value:'d',label:'d. Yes, I do.'},{value:'e',label:'e. We must read.'}];
    var m4=[{value:'a',label:'a. Sure. I like swimming.'},{value:'b',label:"b. No, I didn't."},{value:'c',label:'c. Two books.'},{value:'d',label:'d. Yes, he should.'},{value:'e',label:'e. I was short and slim.'}];
    var m5=[{value:'a',label:"a. I've got a cold."},{value:'b',label:'b. You should go to the doctor.'},{value:'c',label:"c. No, I couldn't."},{value:'d',label:'d. Yes, I do.'},{value:'e',label:'e. We must keep it clean.'}];
    var m6=[{value:'a',label:'a. Yes. I like old things.'},{value:'b',label:'b. Yes, I did.'},{value:'c',label:'c. Five pens.'},{value:'d',label:'d. Yes, you should.'},{value:'e',label:'e. I was tall.'}];
    match('الوحدة الأولى — Language Function (1) — Match 1',["1. What's the matter, Ali?","2. What must we do in the class?","3. Could you read when you were two?","4. Do you have to do your homework?","5. I have a toothache. What should I do?"],m1,['b','a','d','e','c']);
    match('الوحدة الأولى — Language Function (1) — Match 2',['1. Should he stay in bed?','2. How many apples do you want?','3. Did you have to clean the room?','4. Would you like to go to the mall?','5. What did you look like in grade 1?'],m2,['b','c','a','e','d']);
    var r1='My name is Ali. I want to tell you about my last camping trip. Last week, I went with my mom, dad and brother. I took my raincoat because it was raining. We arrived and set the tent. When the rain stopped, we saw a rainbow. We were excited. The next morning, my mom and dad walked near the river. My brother and I went fishing, went cycling, and played tennis. At night, we were hungry. So, my dad started the fire and roasted the fish and meat. The dinner was delicious. Later, we slept outside the tent because it was small. It was fun to sleep under the stars. The next day, we went home. We really enjoyed the nice trip.';
    choice('الوحدة الأولى — Reading (1)','1. What is the text MAINLY about?','D',mcq('A fishing trip','A school trip','A science trip','A camping trip'),r1);
    choice('الوحدة الأولى — Reading (1)',"2. What does the underlined word 'enjoyed' mean?",'A',mcq('loved','called','helped','opened'),r1);
    text('الوحدة الأولى — Reading (1)','3. What did they see after the rain stopped?','a rainbow||rainbow||they saw a rainbow',r1);
    text('الوحدة الأولى — Reading (1)','4. What did Mom and Dad do the next morning?','walked near the river||they walked near the river',r1);
    text('الوحدة الأولى — Reading (1)','5. Why did the family sleep outside the tent?','because it was small||the tent was small||because their tent was small',r1);
    var vb1=['sour','skiing','horse','headache','park','password'];
    ["1. We drank some ______ lemon juice, but I didn't like it.","2. I go ______ when there's snow.",'3. This is a ______. I can ride it.',"4. I've got a ______. My head hurts a lot.","5. Don't ______ the car in this place. It is a bus stop!","6. What's the ______ for the Wi-Fi?"].forEach(function(q,i){add('الوحدة الأولى — Vocabulary (1) — Fill in the gaps',q,vb1[i],words(['park','headache','horse','skiing','password','sour']),'Choose a suitable word from the word box.');});
    choice('الوحدة الأولى — Vocabulary (1)','7. He was tall and ______ when he was five.','B',mcq('sad','slim','dark','long'));
    choice('الوحدة الأولى — Vocabulary (1)','8. My grandfather needs ______ to read.','C',mcq('cups','cars','glasses','helmets'));
    choice('الوحدة الأولى — Vocabulary (1)','9. I bought this ______ to study and do projects.','C',mcq('car','bike','laptop','school'));
    [
      ['1. You must ______ quietly in the library.','A',['speak','speaks','to speak','speaking']],
      ['2. Children should ______ early every day.','A',['sleep','sleeps','to sleep','sleeping']],
      ['3. My dad ______ the car yesterday.','C',['wash','washes','washed','washing']],
      ["4. We didn't ______ to write an email yesterday.",'C',['has','had','have','having']],
      ['5. How ______ books do you read every week?','D',['tall','long','often','many']]
    ].forEach(function(x){choice('الوحدة الأولى — Grammar (1)',x[0],x[1],mcq.apply(null,x[2]));});
    [
      ['1. Ali play football yesterday. (Correct the verb)','played'],
      ['2. You should cleaned your room every day. (Correct the verb)','clean'],
      ['3. We must wearing a seatbelt. (Correct the verb)','wear'],
      ['4. I has to stop at the red light. (Correct the verb)','have'],
      ['5. How many coffee do you have every day? (Correct the word)','much'],
      ['6. How much apples do you eat every day? (Correct the word)','many'],
      ['7. The window is closed. Can you open them? (Correct the pronoun)','it'],
      ['8. He must work on Friday. (Use: not)','he must not work on Friday||he mustn’t work on Friday'],
      ['9. We should run very fast. (Use: not)','we should not run very fast||we shouldn’t run very fast']
    ].forEach(function(x){text('Grammar — Do as shown (1)',x[0],x[1]);});
    match('الوحدة الثانية — Language Function (2) — Match 1',['1. What are you going to play next week?','2. Could you talk when you were three?','3. Do you have to read this old story?','4. What must we do in the library?',"5. What's the matter, Hamad?"],m3,['b','c','d','e','a']);
    match('الوحدة الثانية — Language Function (2) — Match 2',['1. What did you look like when you were five?','2. Would you like to go to the sea?','3. Did you have to write this text?','4. How many books do you want?','5. Should he drink warm water?'],m4,['e','a','b','c','d']);
    var r2='My uncle grew up in a small village. When he was a boy, he had dark hair and green eyes. He had few things, but much love. He woke up early to birds singing. He could run fast, play football and catch fish. There was no electricity or phones. He walked far to school. In the morning, he worked hard to help his family in the fields. At night, he sat under the stars and heard family stories. He had a lot of fun. His stories teach me that family brings happiness.';
    choice('الوحدة الثانية — Reading (2)','1. What is the text MAINLY about?','A',mcq('A man who worked hard','A man who had dark hair','A man who woke up early','A man who had a lot of fun'),r2);
    choice('الوحدة الثانية — Reading (2)',"2. What does the underlined word 'fun' mean?",'A',mcq('nice','fast','hard','short'),r2);
    text('الوحدة الثانية — Reading (2)','3. What did his uncle look like as a boy?','dark hair and green eyes||he had dark hair and green eyes',r2);
    text('الوحدة الثانية — Reading (2)','4. What could his uncle do?','run fast, play football and catch fish||he could run fast, play football and catch fish',r2);
    text('الوحدة الثانية — Reading (2)','5. Why did his uncle work hard every morning?','to help his family in the fields||he helped his family in the fields||he worked hard to help his family in the fields',r2);
    var vb2=['medicine','delicious','expensive','dark','sauce','cross'];
    ["1. Don't take any ______ without asking a doctor first.",'2. This cake is ______. I like eating it.',"3. His car is very ______. I can't buy it.",'4. Ali has got ______ hair.','5. I like tomato ______. It is delicious.','6. He helped the old man ______ the street.'].forEach(function(q,i){add('الوحدة الثانية — Vocabulary (2) — Fill in the gaps',q,vb2[i],words(['cross','sauce','dark','expensive','delicious','medicine']),'Choose a suitable word from the word box.');});
    choice('الوحدة الثانية — Vocabulary (2)','7. Don’t use this ______. It is not safe.','A',[{value:'A',label:'A. app'},{value:'B',label:'B. mall'},{value:'C',label:'C. park'},{value:'D',label:'D. school'}]);
    choice('الوحدة الثانية — Vocabulary (2)','8. My dad works as a ______. He takes photos.','D',mcq('doctor','teacher','secretary','photographer'));
    choice('الوحدة الثانية — Vocabulary (2)','9. I go to the ______ to have a cup of coffee.','C',mcq('bill','car','café','school'));
    [
      ['1. You should ______ your face every day.','A',['sleep','sleeps','to sleep','sleeping']],
      ['2. We ______ the park yesterday.','C',['clean','cleans','cleaned','cleaning']],
      ["3. My sister didn't ______ to make a cake last week.",'C',['has','had','have','is having']],
      ['4. I ______ to do my homework today.','C',['has','had','have','having']],
      ['5. My car doesn’t work. I will fix ______.','A',['it','her','him','them']]
    ].forEach(function(x){choice('الوحدة الثانية — Grammar (2)',x[0],x[1],mcq.apply(null,x[2]));});
    [
      ['1. The book is on the desk. Can you give them to me? (Correct the pronoun)','it'],
      ['2. You must touch the painting. (Use: not)','you must not touch the painting||you mustn’t touch the painting'],
      ['3. How many milk do you drink every morning? (Correct the word)','much'],
      ['4. How much apples do you eat every day? (Correct the word)','many'],
      ['5. My friend climb a mountain yesterday. (Correct the verb)','climbed'],
      ['6. My sister cook food last week. (Correct the verb)','cooked'],
      ['7. You should drinking more water. (Correct the verb)','drink'],
      ['8. I must finished my project today. (Correct the verb)','finish'],
      ['9. He should eat too much sugar. (Use: not)','he should not eat too much sugar||he shouldn’t eat too much sugar']
    ].forEach(function(x){text('Grammar — Do as shown (2)',x[0],x[1]);});
    match('الوحدة الثالثة — Language Function (3) — Match 1',["1. I've got a headache. What should I do?","2. Could you run when you were two?",'3. Do you have to play tennis on Friday?','4. What must we do in the park?', "5. What's the matter, Khaled?"],m5,['b','c','d','e','a']);
    match('الوحدة الثالثة — Language Function (3) — Match 2',['1. What did you look like when you were five?','2. Would you like to go to the museum?','3. Did you have to water the trees?','4. How many pens do you want?','5. Should I see the doctor?'],m6,['e','a','b','c','d']);
    var r3='Pizza is a tasty dish from Italy. It first came out in a small Italian town. It is an important part of Italian traditions. Today, pizza became one of the most popular foods in the world. In Italy, some people like to eat pizza with a knife and a fork. They usually enjoy it with their friends. Pizza contains cheese and other ingredients. Pizza comes in all shapes and sizes, and it is baked in very hot ovens. Many people like to bake pizza at home because it is healthier. You can also buy pizza from restaurants offering fast food. Pizza is the most famous fast food in Europe, Asia, and America. People from all over the world love it.';
    choice('الوحدة الثالثة — Reading (3)','1. What is the text MAINLY about?','A',mcq('food','countries','traditions','restaurants'),r3);
    choice('الوحدة الثالثة — Reading (3)',"2. What does the underlined word 'tasty' mean?",'C',mcq('fast','strong','delicious','important'),r3);
    text('الوحدة الثالثة — Reading (3)','3. Where does pizza come from?','Italy||Italy.',r3);
    text('الوحدة الثالثة — Reading (3)','4. How do some people like to eat pizza?','with a knife and a fork||with knife and fork||they eat pizza with a knife and a fork',r3);
    text('الوحدة الثالثة — Reading (3)','5. Why do many people like to bake pizza at home?','because it is healthier||it is healthier||because baking pizza at home is healthier',r3);
    var vb3=['pick up','baseball','pass','order','learn','bicycle'];
    ['1. You can ______ your pen and start writing.','2. He plays ______ every week.','3. Could you please ______ me the sugar.','4. He will ______ food online.','5. I want to ______ the English language.',"6. There's a ______ lane for bike riders."].forEach(function(q,i){add('الوحدة الثالثة — Vocabulary (3) — Fill in the gaps',q,vb3[i],words(['pass','pick up','baseball','order','bicycle','learn']),'Choose a suitable word from the word box.');});
    choice('الوحدة الثالثة — Vocabulary (3)','7. My uncle is a ______. He reports the news on TV.','C',mcq('doctor','teacher','reporter','photographer'));
    choice('الوحدة الثالثة — Vocabulary (3)','8. The ______ size of my laptop is very large.','D',mcq('car','door','pencil','screen'));
    choice('الوحدة الثالثة — Vocabulary (3)','9. I went to the ______ to buy fruit.','A',mcq('market','school','hospital','museum'));
    [
      ['1. We ______ to school yesterday.','C',['walk','walks','walked','walking']],
      ['2. They ______ to water the plants.','C',['has','had','have','is having']],
      ['3. You must ______ being noisy.','A',['stop','stops','stopped','stopping']],
      ['4. We should ______ our school clean every day.','A',['keep','keeps','to keep','keeping']],
      ['5. How ______ water do the plants need?','D',['tall','long','often','much']]
    ].forEach(function(x){choice('الوحدة الثالثة — Grammar (3)',x[0],x[1],mcq.apply(null,x[2]));});
    [
      ['1. How many tea do you drink every night? (Correct the word)','much'],
      ['2. How much tables did you buy last week? (Correct the word)','many'],
      ['3. The box is heavy. Can you help me carry them? (Correct the pronoun)','it'],
      ['4. They move to a new house yesterday. (Correct the verb)','moved'],
      ['5. You should planting trees in the park. (Correct the verb)','plant'],
      ['6. He must showed his ID at the gate. (Correct the verb)','show'],
      ["7. We didn't has to pay for parking. (Correct the verb)",'have'],
      ['8. Visitors must feed the animals in the zoo. (Use: not)','visitors must not feed the animals in the zoo||visitors mustn’t feed the animals in the zoo'],
      ['9. He should come to the party tonight. (Use: not)','he should not come to the party tonight||he shouldn’t come to the party tonight']
    ].forEach(function(x){text('Grammar — Do as shown (3)',x[0],x[1]);});
    var orderOptions=[];for(var p=1;p<=7;p++)orderOptions.push({value:String(p),label:'الجملة رقم '+p});
    var w1='إيميل عن زيارة سوق واقف — رتّب الجمل السبع. التحية والخاتمة ثابتتان.';
    var souqSentences=['I went to Souq Waqif.','I went by car.','It was a nice place.','I walked in the market.','I saw many shops.','I ate nice food.','I was very happy.'];
    var souqShuffle=[3,0,5,2,6,1,4];
    souqShuffle.forEach(function(sentenceIndex){
      choice('الوحدة الثالثة — Writing (1) — إيميل زيارة سوق واقف','ما ترتيب هذه الجملة؟ '+souqSentences[sentenceIndex],String(sentenceIndex+1),orderOptions,'Hi Ali,\\n'+w1+'\\nBye for now');
    });
    var w2='إيميل عن زيارة المملكة العربية السعودية — رتّب الجمل السبع. التحية والخاتمة ثابتتان.';
    var ksaSentences=['I went to KSA.','I visited Mecca.','I went by car.','I did Omrah.','I saw Kaabah.','I prayed near it.','I was very happy.'];
    var ksaShuffle=[4,2,0,5,1,6,3];
    ksaShuffle.forEach(function(sentenceIndex){
      choice('الصفحة الأخيرة — الوحدة الثالثة — Writing (2) — إيميل زيارة KSA','ما ترتيب هذه الجملة؟ '+ksaSentences[sentenceIndex],String(sentenceIndex+1),orderOptions,'Hi Ali,\\n'+w2+'\\nBye for now');
    });
    var maxScore=fields.reduce(function(t,f){return t+Number(f.points||1);},0);
    if(fields.length!==128||maxScore!==128)throw new Error('Worksheet count mismatch: '+fields.length+'/'+maxScore);
    return {fields:fields,answerKey:answerKey,maxScore:maxScore};
  }
  window.buildGrade6EnrichmentWorkbookData=build;
})();