from tf.fabric import Fabric
TF=Fabric(locations='/home/claude/etcbc/bhsa/tf/2021',silent='deep')
api=TF.load('lex sp vt typ function domain',silent='deep')
Q=["clause typ=NmCl\n  phrase function=Subj\n    word lex=JHWH/\n",
"clause\n  w1:word lex=HNH\n  w2:word sp=verb vt=ptca\nw1 < w2\n",
"phrase function=Objc\n  word lex=>T\n  <: word lex=H\n",
"clause domain#Q\n  =: word lex=W\n  <: word lex=HJH[ vt=wayq\n",
"clause\n  phrase function=Subj\n    word lex=JHWH/|>LHJM/\n  phrase function=Pred|PreO|PreS|PreC\n    word sp=verb\n"]
for q in Q:
    r=list(api.S.search(q)); print(len(r))
