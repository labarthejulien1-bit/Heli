// Traductions : français (source), anglais, espagnol, portugais, allemand, italien.
// Chaque clé doit exister dans toutes les langues (vérifié par tools/i18n-check.mjs).
const K = `play levels hangar profile settings level pilot tagline welcome welcomeText namePh start
lvl1 lvl2 lvl3 lvl4 lvl5 lvl6 lvl7 lvl8 lvl9 lvl10
o_finish o_orbs o_time o_hp o_hits o_nocp o_soft o_rings u_medals
stat_power stat_agility stat_armor stat_speed select selected locked toUnlock
best lockedLevel objectives pause resume restart quit crashed fromCp
levelDone time orbs hits next retry menu newHeli newRecord checkpoint repaired
tut1 tut2 tut3 tut4 ready
s_general s_audio s_controls s_display s_data s_lang s_music s_sfx s_vibe s_quality q_low q_med q_high
s_sens s_invert s_shake s_fps s_battery export import reset resetConfirm install s_about imported importErr
rank rank0 rank1 rank2 rank3 rank4 rank5 rank6 medals nextRank maxRank
st_flights st_dist st_orbs st_crashes st_time st_landings cancel confirm rings
o_stars stars refuel fueled lowFuel noFuel fromPad tut5 st_refuels
buy notEnough bought
lvl11 lvl12 lvl13 lvl14 lvl15 lvl16 lvl17 lvl18 lvl19 lvl20 lvl21 lvl22 lvl23 lvl24 lvl25 lvl26 lvl27 lvl28 lvl29 lvl30
tutC tutD tutOk dmgTitle dmg1 dmg2 dmg3 dmg4 go replayTut
next ctlTitle ctl1 ctl2 ctl3 landTitle land1 land2 land3 shopTitle shop1 shop2 shop3 ok s_diff d_easy d_normal d_hard d_easyTxt d_normalTxt d_hardTxt
home adventure map soon enter
places r_fuel r_wind r_unlock p_agile p_alt p_water p_wind p_heavy
r_lvl1 r_uni1 r_victims r_reco r_aboard r_thanks r_full r_needBig r_cancel r_done r_star1 r_star2 r_star3 r_tut1 r_tut2 r_tut3 r_tut4 r_v_hiker
r_lvl2 r_lvl3 r_lvl4 r_lvl5 r_uni2 r_uni3 r_uni4 r_uni5 r_v_dog r_v_walker r_v_climber r_v_resident r_v_cat r_tide r_missions`.split(/\s+/);

const T = {
  fr: `Jouer|Niveaux|Hangar|Profil|Réglages|Niveau|Pilote|Maîtrise la gravité|Bienvenue, pilote|Choisis ton nom de pilote. Ta progression est enregistrée uniquement sur cet appareil.|Ton nom de pilote|Décoller
Aube alpine|Forêt des brumes|Canyon ocre|Côte turquoise|Métropole au crépuscule|Pics glacés|Vallée des temples|Cœur du volcan|Néon nocturne|Archipel céleste
Terminer le niveau|Récolter {v} % des pièces|Finir en moins de {v}|Finir avec au moins {v} % de blindage|{v} collisions maximum|Finir sans s'écraser|Atterrissage en douceur|Traverser tous les anneaux|Obtenir {v} médailles
Puissance|Maniabilité|Blindage|Vitesse|Choisir|Sélectionné|Verrouillé|Pour débloquer
Record|Termine le niveau {v} pour débloquer|Objectifs|Pause|Reprendre|Recommencer|Quitter|Appareil détruit|Reprendre au point de contrôle
Niveau terminé !|Temps|Pièces|Collisions|Niveau suivant|Rejouer|Menu|Nouvel hélicoptère débloqué !|Nouveau record !|Point de contrôle|Réparation
Maintiens ton pouce sur l'écran pour faire tourner le rotor|Relâche pour redescendre : dose la poussée par petites pressions|Glisse le pouce à droite pour accélérer, à gauche pour freiner|Pose-toi en douceur sur l'héliport pour terminer|Touche l'écran pour reprendre
Général|Audio|Commandes|Affichage|Données|Langue|Musique|Effets sonores|Vibrations|Qualité graphique|Basse|Moyenne|Haute
Sensibilité d'inclinaison|Inverser l'inclinaison|Tremblement d'écran|Afficher les FPS|Économie de batterie (30 FPS)|Exporter la sauvegarde|Importer une sauvegarde|Réinitialiser la progression|Effacer toute la progression ? Cette action est irréversible.|Installer l'application|100 % hors ligne · aucune pub · aucune collecte de données|Sauvegarde importée|Fichier invalide
Rang|Cadet|Pilote|Lieutenant|Capitaine|Commandant|As|Légende|Médailles|Prochain rang : {v} médailles|Rang maximal atteint
Vols|Distance parcourue|Pièces récoltées|Crashs|Temps de vol|Atterrissages réussis|Annuler|Confirmer|Anneaux
Récolter toutes les étoiles|Étoiles|Plein et réparation|Plein fait|Carburant faible|Panne sèche|Reprendre au dernier ravitaillement|Pose-toi sur les héliports verts pour refaire le plein|Ravitaillements
Acheter|Pas assez pour l'acheter|Hélicoptère acheté !
Dunes dorées|Marais des lucioles|Falaises d'automne|Port industriel|Mer de la Tranquillité|Lagune des méduses|Château des brumes|Savane au couchant|Mine de cristal|Orage tropical|Fjords de minuit|Jardins suspendus|Fonderie|Forêt de champignons|Crevasse de glace|Mégalopole 2099|Temple perdu|Mer de nuages|Planète rouge|Nébuleuse
Glisse le pouce vers la droite pour avancer|Glisse vers la gauche pour freiner|Bien joué, bon vol !|État de l'appareil|Fumée grise : choc léger|Fumée noire : gros dégâts|Flammes : dernier avertissement|Au choc suivant, c'est le crash. Pose-toi sur un héliport vert pour réparer et refaire le plein.|C'est parti|Revoir le tutoriel
Suivant|Les commandes|Appuie : le rotor tourne, l'appareil monte|Relâche : la gravité le ramène vers le sol|Glisse à droite ou à gauche : l'appareil s'incline|Atterrir en douceur|Descends lentement, par petites pressions : aucun dégât|Un posé trop rapide abîme l'appareil|Pose-toi à plat sur les héliports verts et à l'arrivée.|Le hangar|Les pièces achètent les hélicoptères standard|Les étoiles achètent les hélicoptères rares|Pièces et étoiles se gagnent en terminant les niveaux.|Compris|Difficulté|Facile|Normal|Difficile|Dégâts réduits, plus d'essence, posés sans dégât sur les héliports, reprise au dernier ravitaillement|L'expérience prévue|Plus de dégâts, moins d'essence, posés plus exigeants
Accueil|Aventure|Carte|Bientôt disponible|Entrer
Places|Autonomie|Tenue au vent|Réussis le niveau {v} de Heli Rescue|Très agile, idéal pour apprendre|Aucune perte de portance en altitude|Peut se poser sur l'eau|Très stable dans le vent, projecteur pour la nuit|Seul à pouvoir porter les gros animaux
Premier envol|Alpage d'été|À secourir|Appareil conseillé|À bord|Merci !|Appareil complet : retourne à la base|Il faut le Tandem pour cet animal|Embarquement annulé : reste posé|Mission accomplie !|Tout le monde est sauf|En moins de {v}|{v} choc au plus|Pose-toi dans le cercle, près du randonneur|Reste posé pendant qu'il monte à bord|Glisse le pouce à gauche pour faire demi-tour, puis rentre à la base|Pose-toi sur la base pour le débarquer|Randonneur
Le chien égaré|Marée montante|Crevasse|Toits sous l'eau|Forêt de sapins|Côte et falaises|Glacier de haute montagne|Village inondé|Chien|Promeneur|Alpiniste|Habitante|Chat|L'eau est montée trop vite|Missions`,
  en: `Play|Levels|Hangar|Profile|Settings|Level|Pilot|Master gravity|Welcome, pilot|Choose your pilot name. Your progress is saved on this device only.|Your pilot name|Take off
Alpine Dawn|Misty Forest|Ochre Canyon|Turquoise Coast|Dusk Metropolis|Frozen Peaks|Temple Valley|Heart of the Volcano|Neon Night|Sky Archipelago
Finish the level|Collect {v}% of the coins|Finish in under {v}|Finish with at least {v}% armour|{v} collisions at most|Finish without crashing|Soft landing|Fly through every ring|Earn {v} medals
Power|Handling|Armour|Speed|Select|Selected|Locked|To unlock
Best|Finish level {v} to unlock|Objectives|Paused|Resume|Restart|Quit|Aircraft destroyed|Resume from checkpoint
Level complete!|Time|Coins|Collisions|Next level|Replay|Menu|New helicopter unlocked!|New record!|Checkpoint|Repaired
Hold your thumb on the screen to spin the rotor|Release to descend: feather the thrust with short presses|Slide your thumb right to speed up, left to brake|Land gently on the helipad to finish|Touch the screen to resume
General|Audio|Controls|Display|Data|Language|Music|Sound effects|Vibration|Graphics quality|Low|Medium|High
Tilt sensitivity|Invert tilt|Screen shake|Show FPS|Battery saver (30 FPS)|Export save|Import save|Reset progress|Erase all progress? This cannot be undone.|Install the app|100% offline · no ads · no data collection|Save imported|Invalid file
Rank|Cadet|Pilot|Lieutenant|Captain|Commander|Ace|Legend|Medals|Next rank: {v} medals|Highest rank reached
Flights|Distance flown|Coins collected|Crashes|Flight time|Successful landings|Cancel|Confirm|Rings
Collect every star|Stars|Refuel and repair|Tank full|Low fuel|Out of fuel|Resume from last refuel stop|Land on the green helipads to refuel|Refuel stops
Buy|Not enough to buy it|Helicopter purchased!
Golden Dunes|Firefly Marsh|Autumn Cliffs|Industrial Harbour|Sea of Tranquility|Jellyfish Lagoon|Castle in the Mist|Sunset Savanna|Crystal Mine|Tropical Storm|Midnight Fjords|Hanging Gardens|The Foundry|Mushroom Forest|Ice Crevasse|Megacity 2099|Lost Temple|Sea of Clouds|Red Planet|The Nebula
Slide your thumb right to move forward|Slide left to brake|Well done, enjoy the flight!|Aircraft condition|Grey smoke: light knock|Black smoke: heavy damage|Flames: last warning|One more hit and you crash. Land on a green helipad to repair and refuel.|Let's go|Replay the tutorial
Next|Controls|Press: the rotor spins and the aircraft climbs|Release: gravity pulls it back down|Slide right or left: the aircraft tilts|Land gently|Come down slowly with short presses: no damage|Landing too fast damages the aircraft|Touch down flat on the green helipads and at the finish.|The hangar|Coins buy the standard helicopters|Stars buy the rare helicopters|You earn coins and stars by finishing levels.|Got it|Difficulty|Easy|Normal|Hard|Less damage, more fuel, damage-free landings on helipads, restart from the last refuel stop|The intended experience|More damage, less fuel, stricter landings
Home|Adventure|Map|Coming soon|Enter
Seats|Range|Wind handling|Complete Heli Rescue level {v}|Very agile, ideal for learning|No loss of lift at altitude|Can land on water|Very stable in wind, searchlight for night flights|The only one able to carry large animals
First Flight|Summer pasture|To rescue|Recommended aircraft|On board|Thank you!|Aircraft full: return to base|This animal needs the Tandem|Boarding cancelled: stay landed|Mission accomplished!|Everyone is safe|In under {v}|{v} knock at most|Land in the circle, next to the hiker|Stay landed while he climbs aboard|Slide your thumb left to turn around, then head back to base|Land on the base to drop him off|Hiker
The Lost Dog|Rising Tide|Crevasse|Rooftops Under Water|Pine forest|Coast and cliffs|High mountain glacier|Flooded village|Dog|Walker|Climber|Resident|Cat|The water rose too fast|Missions`,
  es: `Jugar|Niveles|Hangar|Perfil|Ajustes|Nivel|Piloto|Domina la gravedad|Bienvenido, piloto|Elige tu nombre de piloto. Tu progreso se guarda solo en este dispositivo.|Tu nombre de piloto|Despegar
Amanecer alpino|Bosque de niebla|Cañón ocre|Costa turquesa|Metrópolis al atardecer|Picos helados|Valle de los templos|Corazón del volcán|Noche de neón|Archipiélago celeste
Terminar el nivel|Recoger el {v} % de las monedas|Terminar en menos de {v}|Terminar con al menos {v} % de blindaje|{v} colisiones como máximo|Terminar sin estrellarse|Aterrizaje suave|Atravesar todos los anillos|Conseguir {v} medallas
Potencia|Maniobrabilidad|Blindaje|Velocidad|Elegir|Seleccionado|Bloqueado|Para desbloquear
Récord|Termina el nivel {v} para desbloquear|Objetivos|Pausa|Reanudar|Reiniciar|Salir|Aparato destruido|Reanudar desde el punto de control
¡Nivel completado!|Tiempo|Monedas|Colisiones|Siguiente nivel|Repetir|Menú|¡Nuevo helicóptero desbloqueado!|¡Nuevo récord!|Punto de control|Reparación
Mantén el pulgar en la pantalla para hacer girar el rotor|Suelta para descender: dosifica el empuje con toques cortos|Desliza el pulgar a la derecha para acelerar, a la izquierda para frenar|Aterriza suavemente en el helipuerto para terminar|Toca la pantalla para reanudar
General|Audio|Controles|Pantalla|Datos|Idioma|Música|Efectos de sonido|Vibración|Calidad gráfica|Baja|Media|Alta
Sensibilidad de inclinación|Invertir inclinación|Temblor de pantalla|Mostrar FPS|Ahorro de batería (30 FPS)|Exportar partida|Importar partida|Reiniciar progreso|¿Borrar todo el progreso? Esta acción es irreversible.|Instalar la aplicación|100 % sin conexión · sin anuncios · sin recopilación de datos|Partida importada|Archivo no válido
Rango|Cadete|Piloto|Teniente|Capitán|Comandante|As|Leyenda|Medallas|Siguiente rango: {v} medallas|Rango máximo alcanzado
Vuelos|Distancia recorrida|Monedas recogidas|Accidentes|Tiempo de vuelo|Aterrizajes logrados|Cancelar|Confirmar|Anillos
Recoger todas las estrellas|Estrellas|Repostaje y reparación|Depósito lleno|Poco combustible|Sin combustible|Reanudar desde el último repostaje|Aterriza en los helipuertos verdes para repostar|Repostajes
Comprar|No tienes suficiente|¡Helicóptero comprado!
Dunas doradas|Pantano de luciérnagas|Acantilados de otoño|Puerto industrial|Mar de la Tranquilidad|Laguna de medusas|Castillo de la bruma|Sabana al ocaso|Mina de cristal|Tormenta tropical|Fiordos de medianoche|Jardines colgantes|La fundición|Bosque de hongos|Grieta de hielo|Megalópolis 2099|Templo perdido|Mar de nubes|Planeta rojo|La nebulosa
Desliza el pulgar a la derecha para avanzar|Desliza a la izquierda para frenar|¡Bien hecho, buen vuelo!|Estado del aparato|Humo gris: golpe leve|Humo negro: daños graves|Llamas: último aviso|Al siguiente golpe te estrellas. Aterriza en un helipuerto verde para reparar y repostar.|Vamos|Repetir el tutorial
Siguiente|Los controles|Pulsa: el rotor gira y el aparato sube|Suelta: la gravedad lo atrae hacia el suelo|Desliza a derecha o izquierda: el aparato se inclina|Aterrizar con suavidad|Baja despacio, con toques cortos: sin daños|Un aterrizaje demasiado rápido daña el aparato|Pósate en plano en los helipuertos verdes y en la meta.|El hangar|Las monedas compran los helicópteros estándar|Las estrellas compran los helicópteros raros|Monedas y estrellas se ganan al terminar los niveles.|Entendido|Dificultad|Fácil|Normal|Difícil|Menos daños, más combustible, aterrizajes sin daños en los helipuertos, reanudar desde el último repostaje|La experiencia prevista|Más daños, menos combustible, aterrizajes más exigentes
Inicio|Aventura|Mapa|Próximamente|Entrar
Plazas|Autonomía|Resistencia al viento|Completa el nivel {v} de Heli Rescue|Muy ágil, ideal para aprender|Sin pérdida de sustentación en altitud|Puede posarse en el agua|Muy estable con viento, foco para la noche|El único capaz de llevar animales grandes
Primer vuelo|Pasto de verano|A rescatar|Aparato recomendado|A bordo|¡Gracias!|Aparato completo: vuelve a la base|Este animal necesita el Tandem|Embarque cancelado: quédate posado|¡Misión cumplida!|Todos a salvo|En menos de {v}|{v} golpe como máximo|Pósate en el círculo, junto al excursionista|Quédate posado mientras sube a bordo|Desliza el pulgar a la izquierda para dar media vuelta y vuelve a la base|Pósate en la base para desembarcarlo|Excursionista
El perro perdido|Marea creciente|Grieta|Tejados bajo el agua|Bosque de abetos|Costa y acantilados|Glaciar de alta montaña|Pueblo inundado|Perro|Paseante|Alpinista|Vecina|Gato|El agua subió demasiado rápido|Misiones`,
  pt: `Jogar|Níveis|Hangar|Perfil|Definições|Nível|Piloto|Domina a gravidade|Bem-vindo, piloto|Escolhe o teu nome de piloto. O teu progresso é guardado apenas neste dispositivo.|O teu nome de piloto|Descolar
Aurora alpina|Floresta da névoa|Desfiladeiro ocre|Costa turquesa|Metrópole ao entardecer|Picos gelados|Vale dos templos|Coração do vulcão|Noite de néon|Arquipélago celeste
Terminar o nível|Recolher {v} % das moedas|Terminar em menos de {v}|Terminar com pelo menos {v} % de blindagem|{v} colisões no máximo|Terminar sem se despenhar|Aterragem suave|Atravessar todos os anéis|Obter {v} medalhas
Potência|Manobrabilidade|Blindagem|Velocidade|Escolher|Selecionado|Bloqueado|Para desbloquear
Recorde|Termina o nível {v} para desbloquear|Objetivos|Pausa|Retomar|Recomeçar|Sair|Aparelho destruído|Retomar no ponto de controlo
Nível concluído!|Tempo|Moedas|Colisões|Nível seguinte|Repetir|Menu|Novo helicóptero desbloqueado!|Novo recorde!|Ponto de controlo|Reparação
Mantém o polegar no ecrã para fazer girar o rotor|Solta para descer: doseia o impulso com toques curtos|Desliza o polegar para a direita para acelerar, para a esquerda para travar|Aterra suavemente no heliporto para terminar|Toca no ecrã para retomar
Geral|Áudio|Controlos|Ecrã|Dados|Idioma|Música|Efeitos sonoros|Vibração|Qualidade gráfica|Baixa|Média|Alta
Sensibilidade de inclinação|Inverter inclinação|Tremor do ecrã|Mostrar FPS|Poupança de bateria (30 FPS)|Exportar gravação|Importar gravação|Repor progresso|Apagar todo o progresso? Esta ação é irreversível.|Instalar a aplicação|100 % offline · sem anúncios · sem recolha de dados|Gravação importada|Ficheiro inválido
Patente|Cadete|Piloto|Tenente|Capitão|Comandante|Ás|Lenda|Medalhas|Próxima patente: {v} medalhas|Patente máxima atingida
Voos|Distância percorrida|Moedas recolhidas|Acidentes|Tempo de voo|Aterragens bem-sucedidas|Cancelar|Confirmar|Anéis
Recolher todas as estrelas|Estrelas|Reabastecimento e reparação|Depósito cheio|Pouco combustível|Sem combustível|Retomar no último reabastecimento|Aterra nos heliportos verdes para reabastecer|Reabastecimentos
Comprar|Não tens o suficiente|Helicóptero comprado!
Dunas douradas|Pântano dos pirilampos|Falésias de outono|Porto industrial|Mar da Tranquilidade|Lagoa das medusas|Castelo da bruma|Savana ao pôr do sol|Mina de cristal|Tempestade tropical|Fiordes da meia-noite|Jardins suspensos|A fundição|Floresta de cogumelos|Fenda de gelo|Megalópole 2099|Templo perdido|Mar de nuvens|Planeta vermelho|A nebulosa
Desliza o polegar para a direita para avançar|Desliza para a esquerda para travar|Boa, bom voo!|Estado do aparelho|Fumo cinzento: choque leve|Fumo preto: danos graves|Chamas: último aviso|No próximo choque despenhas-te. Aterra num heliporto verde para reparar e reabastecer.|Vamos|Rever o tutorial
Seguinte|Os controlos|Prime: o rotor gira e o aparelho sobe|Solta: a gravidade puxa-o para o chão|Desliza para a direita ou esquerda: o aparelho inclina-se|Aterrar com suavidade|Desce devagar, com toques curtos: sem danos|Uma aterragem demasiado rápida danifica o aparelho|Pousa a direito nos heliportos verdes e na chegada.|O hangar|As moedas compram os helicópteros normais|As estrelas compram os helicópteros raros|Moedas e estrelas ganham-se ao terminar os níveis.|Percebido|Dificuldade|Fácil|Normal|Difícil|Menos danos, mais combustível, aterragens sem danos nos heliportos, retomar no último reabastecimento|A experiência prevista|Mais danos, menos combustível, aterragens mais exigentes
Início|Aventura|Mapa|Em breve|Entrar
Lugares|Autonomia|Resistência ao vento|Termina o nível {v} de Heli Rescue|Muito ágil, ideal para aprender|Sem perda de sustentação em altitude|Pode pousar na água|Muito estável ao vento, projetor para a noite|O único capaz de levar animais grandes
Primeiro voo|Pastagem de verão|A resgatar|Aparelho recomendado|A bordo|Obrigado!|Aparelho cheio: regressa à base|Este animal precisa do Tandem|Embarque cancelado: fica pousado|Missão cumprida!|Todos a salvo|Em menos de {v}|{v} choque no máximo|Pousa no círculo, junto ao caminhante|Fica pousado enquanto ele sobe a bordo|Desliza o polegar para a esquerda para dar meia-volta e regressa à base|Pousa na base para o desembarcar|Caminhante
O cão perdido|Maré a subir|Fenda|Telhados debaixo de água|Floresta de abetos|Costa e falésias|Glaciar de alta montanha|Aldeia inundada|Cão|Passeante|Alpinista|Moradora|Gato|A água subiu depressa demais|Missões`,
  de: `Spielen|Level|Hangar|Profil|Einstellungen|Level|Pilot|Meistere die Schwerkraft|Willkommen, Pilot|Wähle deinen Pilotennamen. Dein Fortschritt wird nur auf diesem Gerät gespeichert.|Dein Pilotenname|Abheben
Alpenmorgen|Nebelwald|Ockercanyon|Türkisküste|Metropole in der Dämmerung|Eisgipfel|Tal der Tempel|Herz des Vulkans|Neonnacht|Himmelsarchipel
Level abschließen|{v} % der Münzen einsammeln|In unter {v} abschließen|Mit mindestens {v} % Panzerung abschließen|Höchstens {v} Kollisionen|Ohne Absturz abschließen|Sanfte Landung|Durch alle Ringe fliegen|{v} Medaillen verdienen
Leistung|Wendigkeit|Panzerung|Tempo|Wählen|Ausgewählt|Gesperrt|Zum Freischalten
Rekord|Schließe Level {v} ab, um freizuschalten|Ziele|Pause|Fortsetzen|Neu starten|Beenden|Maschine zerstört|Am Kontrollpunkt fortsetzen
Level geschafft!|Zeit|Münzen|Kollisionen|Nächstes Level|Nochmal|Menü|Neuer Helikopter freigeschaltet!|Neuer Rekord!|Kontrollpunkt|Repariert
Halte den Daumen auf dem Bildschirm, um den Rotor anzutreiben|Loslassen zum Sinken: dosiere den Schub mit kurzen Tipps|Wische nach rechts zum Beschleunigen, nach links zum Bremsen|Lande sanft auf dem Heliport, um abzuschließen|Tippe auf den Bildschirm, um fortzufahren
Allgemein|Audio|Steuerung|Anzeige|Daten|Sprache|Musik|Soundeffekte|Vibration|Grafikqualität|Niedrig|Mittel|Hoch
Neigungsempfindlichkeit|Neigung umkehren|Bildschirmwackeln|FPS anzeigen|Energiesparmodus (30 FPS)|Spielstand exportieren|Spielstand importieren|Fortschritt zurücksetzen|Gesamten Fortschritt löschen? Das kann nicht rückgängig gemacht werden.|App installieren|100 % offline · keine Werbung · keine Datenerfassung|Spielstand importiert|Ungültige Datei
Rang|Kadett|Pilot|Leutnant|Kapitän|Kommandant|Ass|Legende|Medaillen|Nächster Rang: {v} Medaillen|Höchster Rang erreicht
Flüge|Geflogene Strecke|Gesammelte Münzen|Abstürze|Flugzeit|Geglückte Landungen|Abbrechen|Bestätigen|Ringe
Alle Sterne einsammeln|Sterne|Tanken und Reparatur|Vollgetankt|Wenig Treibstoff|Kein Treibstoff|Am letzten Tankstopp fortsetzen|Lande auf den grünen Heliports, um zu tanken|Tankstopps
Kaufen|Nicht genug zum Kaufen|Helikopter gekauft!
Goldene Dünen|Glühwürmchensumpf|Herbstklippen|Industriehafen|Meer der Ruhe|Quallenlagune|Nebelschloss|Savanne im Abendrot|Kristallmine|Tropensturm|Mitternachtsfjorde|Hängende Gärten|Die Gießerei|Pilzwald|Eisspalte|Megacity 2099|Verlorener Tempel|Wolkenmeer|Roter Planet|Der Nebel
Wische nach rechts, um vorwärts zu fliegen|Wische nach links zum Bremsen|Gut gemacht, guten Flug!|Zustand der Maschine|Grauer Rauch: leichter Stoß|Schwarzer Rauch: schwerer Schaden|Flammen: letzte Warnung|Beim nächsten Treffer stürzt du ab. Lande auf einem grünen Heliport, um zu reparieren und zu tanken.|Los geht's|Tutorial wiederholen
Weiter|Die Steuerung|Drücken: Der Rotor dreht, die Maschine steigt|Loslassen: Die Schwerkraft zieht sie zu Boden|Nach rechts oder links wischen: Die Maschine neigt sich|Sanft landen|Langsam sinken, mit kurzen Tipps: kein Schaden|Eine zu schnelle Landung beschädigt die Maschine|Setze flach auf den grünen Heliports und am Ziel auf.|Der Hangar|Münzen kaufen die Standard-Helikopter|Sterne kaufen die seltenen Helikopter|Münzen und Sterne verdienst du durch das Abschließen von Leveln.|Verstanden|Schwierigkeit|Leicht|Normal|Schwer|Weniger Schaden, mehr Treibstoff, schadenfreie Landungen auf Heliports, Neustart am letzten Tankstopp|Das vorgesehene Erlebnis|Mehr Schaden, weniger Treibstoff, strengere Landungen
Start|Abenteuer|Karte|Demnächst verfügbar|Los
Plätze|Reichweite|Windfestigkeit|Schließe Heli-Rescue-Level {v} ab|Sehr wendig, ideal zum Lernen|Kein Auftriebsverlust in der Höhe|Kann auf dem Wasser landen|Sehr stabil bei Wind, Scheinwerfer für die Nacht|Als einziger kann er große Tiere tragen
Erster Flug|Sommeralm|Zu retten|Empfohlene Maschine|An Bord|Danke!|Maschine voll: zurück zur Basis|Dieses Tier braucht den Tandem|Einstieg abgebrochen: bleib am Boden|Mission erfüllt!|Alle in Sicherheit|In unter {v}|Höchstens {v} Stoß|Lande im Kreis neben dem Wanderer|Bleib am Boden, während er einsteigt|Wische nach links, um zu wenden, und flieg zur Basis zurück|Lande auf der Basis, um ihn abzusetzen|Wanderer
Der verirrte Hund|Steigende Flut|Gletscherspalte|Dächer unter Wasser|Tannenwald|Küste und Klippen|Hochgebirgsgletscher|Überflutetes Dorf|Hund|Spaziergänger|Bergsteiger|Bewohnerin|Katze|Das Wasser ist zu schnell gestiegen|Missionen`,
  it: `Gioca|Livelli|Hangar|Profilo|Impostazioni|Livello|Pilota|Domina la gravità|Benvenuto, pilota|Scegli il tuo nome da pilota. I tuoi progressi sono salvati solo su questo dispositivo.|Il tuo nome da pilota|Decolla
Alba alpina|Foresta delle nebbie|Canyon ocra|Costa turchese|Metropoli al tramonto|Vette ghiacciate|Valle dei templi|Cuore del vulcano|Notte al neon|Arcipelago celeste
Completa il livello|Raccogli il {v} % delle monete|Finisci in meno di {v}|Finisci con almeno il {v} % di corazza|Massimo {v} collisioni|Finisci senza schiantarti|Atterraggio morbido|Attraversa tutti gli anelli|Ottieni {v} medaglie
Potenza|Maneggevolezza|Corazza|Velocità|Scegli|Selezionato|Bloccato|Per sbloccare
Record|Completa il livello {v} per sbloccare|Obiettivi|Pausa|Riprendi|Ricomincia|Esci|Velivolo distrutto|Riprendi dal checkpoint
Livello completato!|Tempo|Monete|Collisioni|Livello successivo|Rigioca|Menu|Nuovo elicottero sbloccato!|Nuovo record!|Checkpoint|Riparazione
Tieni il pollice sullo schermo per far girare il rotore|Rilascia per scendere: dosa la spinta con tocchi brevi|Scorri il pollice a destra per accelerare, a sinistra per frenare|Atterra dolcemente sull'eliporto per finire|Tocca lo schermo per riprendere
Generale|Audio|Comandi|Schermo|Dati|Lingua|Musica|Effetti sonori|Vibrazione|Qualità grafica|Bassa|Media|Alta
Sensibilità di inclinazione|Inverti inclinazione|Tremolio dello schermo|Mostra FPS|Risparmio batteria (30 FPS)|Esporta salvataggio|Importa salvataggio|Azzera i progressi|Cancellare tutti i progressi? L'azione è irreversibile.|Installa l'app|100 % offline · niente pubblicità · nessuna raccolta di dati|Salvataggio importato|File non valido
Grado|Cadetto|Pilota|Tenente|Capitano|Comandante|Asso|Leggenda|Medaglie|Prossimo grado: {v} medaglie|Grado massimo raggiunto
Voli|Distanza percorsa|Monete raccolte|Schianti|Tempo di volo|Atterraggi riusciti|Annulla|Conferma|Anelli
Raccogli tutte le stelle|Stelle|Rifornimento e riparazione|Pieno fatto|Carburante scarso|Carburante esaurito|Riprendi dall'ultimo rifornimento|Atterra sugli eliporti verdi per fare rifornimento|Rifornimenti
Compra|Non hai abbastanza|Elicottero acquistato!
Dune dorate|Palude delle lucciole|Scogliere d'autunno|Porto industriale|Mare della Tranquillità|Laguna delle meduse|Castello delle brume|Savana al tramonto|Miniera di cristallo|Tempesta tropicale|Fiordi di mezzanotte|Giardini pensili|La fonderia|Foresta di funghi|Crepaccio di ghiaccio|Megalopoli 2099|Tempio perduto|Mare di nuvole|Pianeta rosso|La nebulosa
Scorri il pollice a destra per avanzare|Scorri a sinistra per frenare|Ben fatto, buon volo!|Stato del velivolo|Fumo grigio: urto leggero|Fumo nero: danni gravi|Fiamme: ultimo avviso|Al prossimo urto ti schianti. Atterra su un eliporto verde per riparare e fare rifornimento.|Si parte|Rivedi il tutorial
Avanti|I comandi|Premi: il rotore gira e il velivolo sale|Rilascia: la gravità lo riporta a terra|Scorri a destra o a sinistra: il velivolo si inclina|Atterrare dolcemente|Scendi piano, con tocchi brevi: nessun danno|Un atterraggio troppo veloce danneggia il velivolo|Posati in piano sugli eliporti verdi e all'arrivo.|L'hangar|Le monete comprano gli elicotteri standard|Le stelle comprano gli elicotteri rari|Monete e stelle si guadagnano completando i livelli.|Capito|Difficoltà|Facile|Normale|Difficile|Meno danni, più carburante, atterraggi senza danni sugli eliporti, ripresa dall'ultimo rifornimento|L'esperienza prevista|Più danni, meno carburante, atterraggi più severi
Home|Avventura|Mappa|Prossimamente|Entra
Posti|Autonomia|Tenuta al vento|Completa il livello {v} di Heli Rescue|Molto agile, ideale per imparare|Nessuna perdita di portanza in quota|Può posarsi sull'acqua|Molto stabile nel vento, faro per la notte|L'unico in grado di portare animali grandi
Primo volo|Alpeggio estivo|Da soccorrere|Velivolo consigliato|A bordo|Grazie!|Velivolo pieno: torna alla base|Per questo animale serve il Tandem|Imbarco annullato: resta a terra|Missione compiuta!|Tutti in salvo|In meno di {v}|Al massimo {v} urto|Atterra nel cerchio, vicino all'escursionista|Resta a terra mentre sale a bordo|Scorri il pollice a sinistra per fare dietrofront e torna alla base|Atterra sulla base per farlo scendere|Escursionista
Il cane smarrito|Marea montante|Crepaccio|Tetti sott'acqua|Foresta di abeti|Costa e scogliere|Ghiacciaio d'alta montagna|Villaggio allagato|Cane|Passeggiatore|Alpinista|Abitante|Gatto|L'acqua è salita troppo in fretta|Missioni`,
};

export const KEYS = K;
export const DICT = {};
for (const [lang, txt] of Object.entries(T)) {
  const vals = txt.split(/[|\n]/);
  DICT[lang] = Object.fromEntries(K.map((k, i) => [k, vals[i]]));
  DICT[lang]._n = vals.length;
}
let cur = 'fr';
export function setLang(l) { cur = DICT[l] ? l : 'en'; if (typeof document !== 'undefined') document.documentElement.lang = cur; }
export function getLang() { return cur; }
export function detectLang() {
  const n = (typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'fr').slice(0, 2).toLowerCase();
  return DICT[n] ? n : 'en';
}
export function t(key, v) {
  const s = DICT[cur][key] ?? DICT.fr[key] ?? key;
  return v === undefined ? s : s.replace('{v}', v);
}
