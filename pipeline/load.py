from tf.fabric import Fabric
TF=Fabric(locations='/home/claude/etcbc/bhsa/tf/2021',silent='deep')
api=TF.load('book chapter verse g_word_utf8 trailer_utf8 lex voc_lex_utf8 gloss sp vs vt ps gn nu st prs function typ domain txt phono language freq_lex lex_utf8',silent='deep')
