var REGIONS_DATA = {
        region: {
            title: 'Регион',
            items: [{
                
                id: 'RU',
                title: 'Россия'
            }, {
                id: 'UA',
                title: 'Украина'
            }, {
                id: 'PL',
                title: 'Польша'
            }]
        },
        lang: {
            title: 'Язык',
            items: [{
                id: 'ru',
                title: 'Русский'
            }]
        },
        quality: {
            title: 'Точность границ',
            items: [{
                id: '2',
                title: '2'
            }, {
                id: '3',
                title: '3'
            }]
        }
    },
    // Шаблон html-содержимого макета.
    optionsTemplate = [
        '<div style="line-height: 34px;" id="regions-params">',
        '{% for paramName, param in data.params %}',
        '{% for key, value in state.values %}',
        '{% if key == paramName %}',
        '<div class="btn-group btn-group-xs">',
        '<button{% if state.enabled %}{% else %} disabled{% endif %} type="button" class="btn btn-primary dropdown-toggle" data-toggle="dropdown">',
        '<span>{{ param.title }}</span>',
        '<span class="value">: {{ value }}</span>',
        '&nbsp;<span class="caret"></span>',
        '</button>',
        '<ul class="dropdown-menu {{ paramName }}">',
        '{% for item in param.items %}',
        '<li{% if item.id == value %} class="active"{% endif %}>',
        '<a id="regions" href="#" data-param="{{ paramName }}" data-id="{{ item.id }}">',
        '{{ item.title }}',
        '</a>',
        '</li>',
        '{% endfor %}',
        '</ul>',
        '</div>&nbsp;',
        '{% endif %}',
        '{% endfor %}',
        '{% endfor %}',
        '</div>'
    ].join('');

ymaps.ready(init);

function init() {
    var opasity = 0.09;
    // Создадим собственный макет RegionControl.
    var RegionControlLayout = ymaps.templateLayoutFactory.createClass(optionsTemplate, {
            build: function () {
                RegionControlLayout.superclass.build.call(this);
                this.handleClick = ymaps.util.bind(this.handleClick, this);
                $(this.getParentElement)
                    .on('click', 'a#regions', this.handleClick);
            },
            clear: function () {
                $(this.getParentElement)
                    .off('click', 'a#regions', this.handleClick);
                RegionControlLayout.superclass.clear.call(this);
            },
            handleClick: function (e) {
                e.preventDefault();
                var $target = $(e.currentTarget);
                var state = this.getData().state;
                var newValues = ymaps.util.extend({}, state.get('values'));
                if (!$target.hasClass('active')) {
                    newValues[$target.data('param')] = $target.data('id');
                    state.set('values', newValues);
                }
            }
        }),
        // Наследуем класс нашего контрола от ymaps.control.Button.
        RegionControl = ymaps.util.defineClass(function (parameters) {
            RegionControl.superclass.constructor.call(this, parameters);
        }, ymaps.control.Button, /** @lends ymaps.control.Button */{
            onAddToMap: function (map) {
                RegionControl.superclass.onAddToMap.call(this, map);
                this.setupStateMonitor();
                this.loadRegions(this.state.get('values'));
            },

            onRemoveFromMap: function (map) {
                map.geoObjects.remove(this.regions);
                this.clearStateMonitor();
                RegionControl.superclass.onRemoveFromMap.call(this, map);
            },

            setupStateMonitor: function () {
                this.stateMonitor = new ymaps.Monitor(this.state);
                this.stateMonitor.add('values', this.handleStateChange, this);
            },

            clearStateMonitor: function () {
                this.stateMonitor.removeAll();
            },

            handleStateChange: function (params) {
                this.loadRegions(params);
            },

            handleRegionsLoaded: function (res) {
                if(this.regions){
                    map.geoObjects.remove(this.regions);
                }

                this.regions = new ymaps.ObjectManager();
                this.regions
                    .add(res.features.map(function (feature) {
                        feature.id = feature.properties.iso3166;
                        feature.options = {
                            strokeColor: '#ffffff',
                            strokeOpacity: 0.4,
                            fillColor: '#6961b0',
                            fillOpacity: 0.4,
                            hintCloseTimeout: 0,
                            hintOpenTimeout: 0,
                            zIndex: -9999
                        };
                        return feature;
                    }));
                map.geoObjects.add(this.regions);

                this.selectedRegionId = '';
                this.regions.events
                    .add('mouseenter', function (e) {
                        var id = e.get('objectId');
                        this.regions.objects.setObjectOptions(id, {strokeWidth: 2});
                    }, this)
                    .add('mouseleave', function (e) {
                        var id = e.get('objectId');
                        if (this.selectedRegionId !== id) {
                            this.regions.objects.setObjectOptions(id, {strokeWidth: 1});
                        }
                    }, this)
                    .add('click', function (e) {
                        var id = e.get('objectId');
                        if (this.selectedRegionId) {
                            this.regions.objects.setObjectOptions(this.selectedRegionId, {
                                strokeWidth: 1,
                                fillColor: '#6961b0'
                            });
                        }
                        this.regions.objects.setObjectOptions(id, {strokeWidth: 2, fillColor: '#3B3781'});
                        this.selectedRegionId = id;
                    }, this);
                this.getMap().setBounds(
                    this.regions.getBounds(),
                    {checkZoomRange: true}
                );
            },

            loadRegions: function (params) {
                this.disable();
                return ymaps.borders.load(params.region, params)
                    .then(this.handleRegionsLoaded, this)
                    .always(this.enable, this);
            }
        }),

        map = new ymaps.Map('map', {
            center: [50, 30],
            zoom: 3,
            controls: ['typeSelector']
        }, {
            typeSelectorSize: 'small'
        }),

        // Создадим экземпляр RegionControl.
        regionControl = new RegionControl({
            state: {
                enabled: true,
                values: {
                    region: 'UA',
                    lang: 'ru',
                    quality: '2'
                }
            },
            data: {
                params: REGIONS_DATA
            },
            options: {
                layout: RegionControlLayout
            },
            float: 'left',
            maxWidth: [300],
        zIndex: -1
        });

    // Добавим контрол на карту.
    map.controls.add(regionControl);
    // Узнавать о изменениях параметров RegionControl можно следующим образом.
    regionControl.events.add('statechange', function (e) {
        console.log(e.get('target').get('values'));
    });

    
    var myCircle = new ymaps.Circle([
        [51.474959, 46.187740],
        1000000
    ],  {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    });
    var text = "kek";




    var myPolyline = new ymaps.Polyline([
        [49.96637435862629, 38.08892018750001],
        [49.84408759723107, 37.90410747620462],
        [49.72505020562931, 38.01592562428418],
        [49.22774470642462, 37.89349258450596],
        [49.126033823312646, 38.08399522523016],
        [48.787365470779505, 38.10508883074851],
        [48.581419150483796, 38.005332826891895],
        [48.127632565871785, 37.88866944142719],
        [47.77005840455175, 37.252262797615415],
        [47.5683323349482, 36.301248688602584],
        [47.47766515169988, 35.28431661083984],
        [47.35487539198441, 34.984595846679674],
        [47.52680813639699, 34.62685353710938],
        [47.39369809921484, 34.109122824218744],
        [46.855834914393995, 33.622977804687494],
        [46.76938675093311, 33.22197682812499],
        [46.50511649348019, 32.178275656250015],
        [46.55178680822653, 31.519095968749994]
    ], {}, {
        strokeColor: "#00000088",
        strokeWidth: 4,
        editorMaxPoints: 50,
        editorMenuManager: function (items) {
            //text = myPolyline.geometry.getCoordinates();
             console.log(text);
            items.push({
                title: `${myPolyline.geometry.getCoordinates()}`,
            });
            return items;
        }
    });

    map.geoObjects.add(myPolyline);
    map.geoObjects.add(new ymaps.Polygon([
      // Координаты внешнего контура.
    [[46.496354894172136, 32.20024831249992],
[46.86366269832235, 33.66692311718742],
[47.43768301037207, 34.51476875387689],
[47.43988302244412, 36.2570509472216],
[48.00547102440193, 37.91144251556635],
[49.92340130530459, 38.15693847644533],
[50.322793068540506, 35.58822476796508],
[52.416576600981045, 33.6786907469849],
[52.07325470804669, 31.705325830024446],
[53.14509038731509, 31.495896009018686],
[53.30512171111038, 32.736661500513],
[54.93475420344323, 31.087333108501532],
[55.60770708299605, 30.8581308792277],
[56.244799174435705, 28.167991149953814],
[58.160049471834945, 27.433417826929993],
[60.15286016531493, 27.358024191406162],
[60.47654540054016, 35.376670431640534],
[59.71782881237668, 40.528571676757736],
[57.34504907675901, 45.301787924316336],
[54.8493982450897, 49.62198979809564],
[51.68106762685978, 51.49644620373529],
[49.968642908856125, 48.62702001065058],
[48.15233633843288, 47.09886905210477],
[46.14569065943351, 49.31203426823983],
[44.542569657036424, 46.778167369148555],
[41.883894381253256, 48.550941095057354],
[41.11625030789985, 47.70896872721612],
[42.97917571869029, 44.211810668295485],
[43.393416521109216, 39.90166432812487],
[45.24892836921117, 36.70738942578112],
[44.11471570330784, 33.60100514843743],
[45.066864350306595, 33.55980641796867],
[45.328199131905826, 32.5614238496093],
[46.02763482161741, 33.6387706513671],
[46.038432430888584, 32.49104268505852],
[46.55178680822653, 31.519095968749994]],
], {
    hintContent: "Зона досягаемости Ту-141"
}, {
    fillColor: '#6699ff',
    // Делаем полигон прозрачным для событий карты.
    interactivityModel: 'default#transparent',
    strokeWidth: 8,
    opacity: 0.15
}))
    .add(new ymaps.Polygon([
      // Координаты внешнего контура.
    [[46.496354894172136, 32.20024831249992],
[46.86366269832235, 33.66692311718742],
[47.43768301037207, 34.51476875387689],
[47.43988302244412, 36.2570509472216],
[48.00547102440193, 37.91144251556635],
[49.92340130530459, 38.15693847644533],
[50.322793068540506, 35.58822476796508],
[52.416576600981045, 33.6786907469849],
[52.07325470804669, 31.705325830024446],
[53.14509038731509, 31.495896009018686],
[53.30512171111038, 32.736661500513],
[54.93475420344323, 31.087333108501532],
[55.60770708299605, 30.8581308792277],
[56.244799174435705, 28.167991149953814],
[58.160049471834945, 27.433417826929993],
[59.197206265217055, 27.358024191406162],
[59.6027729064716, 34.77242238476555],
[58.91476423515924, 39.50684316113272],
[56.84270900520203, 44.038360189941315],
[54.358302803321145, 48.23771245434563],
[51.441397198392885, 49.914414953735324],
[49.968642908856125, 48.62702001065058],
[48.15233633843288, 47.09886905210477],
[46.14569065943351, 49.31203426823983],
[44.542569657036424, 46.778167369148555],
[41.883894381253256, 48.550941095057354],
[41.11625030789985, 47.70896872721612],
[42.97917571869029, 44.211810668295485],
[43.393416521109216, 39.90166432812487],
[45.24892836921117, 36.70738942578112],
[44.11471570330784, 33.60100514843743],
[45.066864350306595, 33.55980641796867],
[45.328199131905826, 32.5614238496093],
[46.02763482161741, 33.6387706513671],
[46.038432430888584, 32.49104268505852],
[46.55178680822653, 31.519095968749994]],
], {
    hintContent: "Зона досягаемости Мугин-5"
}, {
    fillColor: '#FFE4C4',
    // Делаем полигон прозрачным для событий карты.
    interactivityModel: 'default#transparent',
    strokeWidth: 8,
    opacity: 0.15
})).add(new ymaps.Polygon([
      // Координаты внешнего контура.
    [[46.496354894172136, 32.20024831249992],
[46.86366269832235, 33.66692311718742],
[47.43768301037207, 34.51476875387689],
[47.43988302244412, 36.2570509472216],
[48.00547102440193, 37.91144251556635],
[49.92340130530459, 38.15693847644533],
[50.322793068540506, 35.58822476796508],
[52.416576600981045, 33.6786907469849],
[52.07325470804669, 31.705325830024446],
[53.14509038731509, 31.495896009018686],
[53.30512171111038, 32.736661500513],
[54.93475420344323, 31.087333108501532],
[55.60770708299605, 30.8581308792277],
[56.244799174435705, 28.167991149953814],
[58.160049471834945, 27.433417826929993],
[58.5601121124568, 27.379996847656127],
[58.85392304502172, 34.80538136914055],
[58.28976913440509, 38.814704489257736],
[56.17449929250424, 43.302276205566315],
[54.003868015974284, 47.02921636059562],
[51.324527405716566, 48.53013760998532],
[49.968642908856125, 48.62702001065058],
[48.15091480060763, 47.03896992200267],
[46.84202721819807, 48.52709170835475],
[46.06927486592255, 48.169456143239806],
[44.542569657036424, 46.778167369148555],
[44.36201566372411, 46.88101922005728],
[42.643266718184854, 44.91844138346612],
[42.97917571869029, 44.211810668295485],
[43.393416521109216, 39.90166432812487],
[45.24892836921117, 36.70738942578112],
[44.11471570330784, 33.60100514843743],
[45.066864350306595, 33.55980641796867],
[45.328199131905826, 32.5614238496093],
[46.02763482161741, 33.6387706513671],
[46.038432430888584, 32.49104268505852],
[46.55178680822653, 31.519095968749994]],
], {
    hintContent: "Зона досягаемости UJ-22 Airborne"
}, {
    fillColor: '#FCB4D5',
    // Делаем полигон прозрачным для событий карты.
    interactivityModel: 'default#transparent',
    strokeWidth: 8,
    opacity: 0.15
})).add(new ymaps.Polygon([
      // Координаты внешнего контура.
    [[46.496354894172136, 32.20024831249992],
[46.86366269832235, 33.66692311718742],
[47.43768301037207, 34.51476875387689],
[47.43988302244412, 36.2570509472216],
[48.00547102440193, 37.91144251556635],
[49.92340130530459, 38.15693847644533],
[50.322793068540506, 35.58822476796508],
[52.416576600981045, 33.6786907469849],
[52.07325470804669, 31.705325830024446],
[53.14509038731509, 31.495896009018686],
[53.30512171111038, 32.736661500513],
[54.93475420344323, 31.087333108501532],
[55.60770708299605, 30.8581308792277],
[56.244799174435705, 28.167991149953814],
[56.83530682052311, 27.89484360817995],
[56.89120564930409, 28.17101247265616],
[57.40116049704085, 34.365928244140555],
[56.96984362971408, 37.21070058300773],
[55.08059263890421, 41.01711995556633],
[53.58758389726934, 44.12882573559562],
[50.951301610409004, 45.91539151623531],
[49.655834628193105, 46.166082510650604],
[48.07876794141412, 46.04418155210475],
[46.67761702665998, 45.6206280182398],
[45.40039045213647, 44.71273768164857],
[44.409285943024194, 43.43131218880728],
[43.73648569611021, 42.74314841471613],
[43.22069424135858, 41.86073644954543],
[43.393416521109216, 39.90166432812487],
[45.24892836921117, 36.70738942578112],
[44.11471570330784, 33.60100514843743],
[45.066864350306595, 33.55980641796867],
[45.328199131905826, 32.5614238496093],
[46.02763482161741, 33.6387706513671],
[46.038432430888584, 32.49104268505852],
[46.55178680822653, 31.519095968749994]],
], {
    hintContent: "Зона досягаемости Skyeye"
}, {
    fillColor: '#DDADAF',
    // Делаем полигон прозрачным для событий карты.
    interactivityModel: 'default#transparent',
    strokeWidth: 8,
    opacity: 0.15
})).add(new ymaps.Polygon([
      // Координаты внешнего контура.
    [[46.496354894172136, 32.20024831249992],
[46.86366269832235, 33.66692311718742],
[47.43768301037207, 34.51476875387689],
[47.43988302244412, 36.2570509472216],
[48.00547102440193, 37.91144251556635],
[49.92340130530459, 38.15693847644533],
[50.322793068540506, 35.58822476796508],
[52.416576600981045, 33.6786907469849],
[52.07325470804669, 31.705325830024446],
[53.14509038731509, 31.495896009018686],
[53.30512171111038, 32.736661500513],
[54.93475420344323, 31.087333108501532],
[55.60770708299605, 30.8581308792277],
[56.12225863201809, 28.541526306203814],
[56.20372538914979, 28.883613139429965],
[56.516520158954535, 31.77452809765616],
[56.512841599633866, 35.047080587890534],
[55.99729213286423, 37.364509176757736],
[54.09809510740233, 41.30276448681632],
[52.63570142343149, 43.579509329345576],
[50.75658182104779, 44.55308682873532],
[49.08187575483649, 44.7818051669006],
[47.7850928890476, 44.6977764557398],
[46.53417782937464, 44.09750330664853],
[44.53515212226728, 42.112952813807276],
[43.457475702824524, 39.65996510937484],
[45.24892836921117, 36.70738942578112],
[44.11471570330784, 33.60100514843743],
[45.066864350306595, 33.55980641796867],
[45.328199131905826, 32.5614238496093],
[46.02763482161741, 33.6387706513671],
[46.038432430888584, 32.49104268505852],
[46.55178680822653, 31.519095968749994]]
], {
    hintContent: "Зона досягаемости  Systems PD-1 "
}, {
    fillColor: '#C9C0BB',
    // Делаем полигон прозрачным для событий карты.
    interactivityModel: 'default#transparent',
    strokeWidth: 8,
    opacity: 0.15
})).add(new ymaps.Polygon([
      // Координаты внешнего контура.
    [[46.496354894172136, 32.20024831249992],
[46.86366269832235, 33.66692311718742],
[47.43768301037207, 34.51476875387689],
[47.43988302244412, 36.2570509472216],
[48.00547102440193, 37.91144251556635],
[49.92340130530459, 38.15693847644533],
[50.322793068540506, 35.58822476796508],
[52.416576600981045, 33.6786907469849],
[52.07325470804669, 31.705325830024446],
[52.50625043555021, 31.58378663401867],
[52.83229159865348, 33.48235263975152],
[52.06097920918435, 34.996612143066336],
[51.305854467200746, 35.99894292309563],
[50.96517890109111, 36.44517667248527],
[50.82536524405534, 37.8604184481506],
[50.16937396569757, 38.46361514585476],
[48.9272760931637, 38.567405361989806],
[48.29387732483984, 38.51644861914855],
[47.53356584835318, 37.696448907557304],
[47.16813531712362, 36.261214820966124],
[47.1204135654343, 34.82048757031242],
[46.80669171497469, 34.17504079296863],
[46.357068550151716, 33.242576193359305],
[46.252248364947604, 31.996657919433506],
[46.55178680822653, 31.519095968749994]]
], {
    hintContent: "Зона досягаемости  Fly Eye  "
}, {
    fillColor: '#657F4B',
    // Делаем полигон прозрачным для событий карты.
    interactivityModel: 'default#transparent',
    strokeWidth: 8,
    opacity: 0.15
}));

    //
    //
    //
    //ТОЧКИ ПРИЛЕТОВ Skyeye
    //
    //
    //
    map.geoObjects
    .add(new ymaps.Placemark([54.248350, 34.377160],{
            balloonContent: 'прилет Skyeye'
        }, {
            preset: 'islands#circleDotIcon',
            iconColor: '#cd9575'
        }));
    //
    //
    //
    //ТОЧКИ ПРИЛЕТОВ  Systems PD-1 
    //
    //
    //
    map.geoObjects
    .add(new ymaps.Placemark([47.832619, 39.861856],{
            balloonContent: 'прилет  Systems PD-1 '
        }, {
            preset: 'islands#circleDotIcon',
            iconColor: '#f80000'
        }));
    //
    //
    //
    //ТОЧКИ ПРИЛЕТОВ  Fly Eye  
    //
    //
    //
    map.geoObjects
    .add(new ymaps.Placemark([50.595414, 36.587277],{
            balloonContent: 'прилет  Fly Eye  '
        }, {
            preset: 'islands#circleDotIcon',
            iconColor: '#7b917b'
        }));
    //
    //
    //
    //ТОЧКИ ПРИЛЕТОВ ТУ141
    //
    //
    //
    map.geoObjects
    .add(new ymaps.Placemark([51.474959, 46.187740],{
            balloonContent: 'прилет'
        }, {
            preset: 'islands#circleDotIcon',
            iconColor: '#990066'
        }))
    .add(new ymaps.Placemark([54.651495, 39.574247],{
            balloonContent: 'прилет'
        }, {
            preset: 'islands#circleDotIcon',
            iconColor: '#990066'
        }))
    .add(new ymaps.Placemark([53.934949, 37.928542],{
            balloonContent: 'прилет'
        }, {
            preset: 'islands#circleDotIcon',
            iconColor: '#990066'
        }))
    .add(new ymaps.Placemark([44.099843, 39.095848],{
            balloonContent: 'прилет'
        }, {
            preset: 'islands#circleDotIcon',
            iconColor: '#990066'
        }))
    .add(new ymaps.Placemark([45.005424, 38.976705],{
            balloonContent: 'прилет'
        }, {
            preset: 'islands#circleDotIcon',
            iconColor: '#990066'
        }))
    .add(new ymaps.Placemark([45.782794, 15.940538],{
            balloonContent: 'прилет'
        }, {
            preset: 'islands#circleDotIcon',
            iconColor: '#990066'
        }))
    .add(new ymaps.Placemark([45.190635, 33.367643],{
            balloonContent: 'прилет'
        }, {
            preset: 'islands#circleDotIcon',
            iconColor: '#990066'
        }))
    //
    //
    //
    //ТОЧКИ ПРИЛЕТОВ МУГИНОВ
    //
    //
    //
    map.geoObjects
    .add(new ymaps.Placemark([45.713348, 34.392872],{
            balloonContent: 'прилет'
        }, {
            preset: 'islands#circleDotIcon',
            iconColor: '#99ff66'
        }))
    .add(new ymaps.Placemark([45.383643, 33.117076],{
            balloonContent: 'прилет'
        }, {
            preset: 'islands#circleDotIcon',
            iconColor: '#99ff66'
        }))
    .add(new ymaps.Placemark([44.686576, 33.570838],{
            balloonContent: 'прилет'
        }, {
            preset: 'islands#circleDotIcon',
            iconColor: '#99ff66'
        }))
    .add(new ymaps.Placemark([44.617879, 33.5059800],{
            balloonContent: 'прилет'
        }, {
            preset: 'islands#circleDotIcon',
            iconColor: '#99ff66'
        }))
    .add(new ymaps.Placemark([53.949081, 36.546585],{
            balloonContent: 'прилет'
        }, {
            preset: 'islands#circleDotIcon',
            iconColor: '#99ff66'
        }))
    .add(new ymaps.Placemark([45.713348, 34.392872],{
            balloonContent: 'прилет'
        }, {
            preset: 'islands#circleDotIcon',
            iconColor: '#99ff66'
        }))
    //
    //
    //
    //ТОЧКИ ПРИЛЕТОВ UJ-22 Airborne
    //
    //
    //
    map.geoObjects
    .add(new ymaps.Placemark([55.409695, 38.807045],{
            balloonContent: 'прилет UJ-22 Airborne'
        }, {
            preset: 'islands#circleDotIcon',
            iconColor: '#d84b20'
        }))
    .add(new ymaps.Placemark([55.843251, 38.469119],{
            balloonContent: 'прилет UJ-22 Airborne'
        }, {
            preset: 'islands#circleDotIcon',
            iconColor: '#d84b20'
        }))
    .add(new ymaps.Placemark([55.737213, 38.340106],{
            balloonContent: 'прилет UJ-22 Airborne'
        }, {
            preset: 'islands#circleDotIcon',
            iconColor: '#d84b20'
        }))


    //myPolyline.editor.startEditing(); 
    /*var dotline = new ymaps.Polyline([
       
[46.496354894172136, 32.20024831249992],
[46.86366269832235, 33.66692311718742],
[47.43768301037207, 34.51476875387689],
[47.43988302244412, 36.2570509472216],
[48.00547102440193, 37.91144251556635],
[49.92340130530459, 38.15693847644533],
[50.322793068540506, 35.58822476796508],
[52.416576600981045, 33.6786907469849],
[52.07325470804669, 31.705325830024446],
[53.14509038731509, 31.495896009018686],
[53.30512171111038, 32.736661500513],
[54.93475420344323, 31.087333108501532],
[55.60770708299605, 30.8581308792277],
[56.244799174435705, 28.167991149953814],
[58.160049471834945, 27.433417826929993],
[60.15286016531493, 27.358024191406162],
[60.47654540054016, 35.376670431640534],
[59.71782881237668, 40.528571676757736],
[57.34504907675901, 45.301787924316336],
[54.8493982450897, 49.62198979809564],
[51.68106762685978, 51.49644620373529],
[49.968642908856125, 48.62702001065058],
[48.15233633843288, 47.09886905210477],
[46.14569065943351, 49.31203426823983],
[44.542569657036424, 46.778167369148555],
[41.883894381253256, 48.550941095057354],
[41.11625030789985, 47.70896872721612],
[42.97917571869029, 44.211810668295485],
[43.393416521109216, 39.90166432812487],
[45.24892836921117, 36.70738942578112],
[44.11471570330784, 33.60100514843743],
[45.066864350306595, 33.55980641796867],
[45.328199131905826, 32.5614238496093],
[46.02763482161741, 33.6387706513671],
[46.038432430888584, 32.49104268505852],
[46.55178680822653, 31.519095968749994]
    ], {}, {
        strokeColor: "#00000088",
        strokeWidth: 4,
        editorMaxPoints: 50,
        editorMenuManager: function (items) {
            text = dotline.geometry.getCoordinates();
             console.log(text);
            items.push({
                title: `${dotline.geometry.getCoordinates()}`,
            });
            return items;
        }
    });
    map.geoObjects.add(dotline);
    dotline.editor.startEditing(); 
    //
    //
    //
    //
    //
    //
    //
    //
    //
    //
    var dist = 50000;


     map.geoObjects
    .add(new ymaps.Circle([
        [46.62563996583477, 31.54090864667404],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }))
    .add(new ymaps.Circle([
        [46.6899378136449, 32.793350052924005],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }))
    .add(new ymaps.Circle([
        [47.201552065594456, 33.776626420111505],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }))
    .add(new ymaps.Circle([
        [],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }))
    .add(new ymaps.Circle([
        [47.58203583022641, 34.80384809979901],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }))
    .add(new ymaps.Circle([
        [47.58575238496784, 35.97938520917398],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }))
    .add(new ymaps.Circle([
        [47.782349978077015, 37.17140181073646],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }))
    .add(new ymaps.Circle([
        [48.56858648098157, 37.95143110761146],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }))
    .add(new ymaps.Circle([
        [49.48607440112652, 37.82508833417394],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }))
    .add(new ymaps.Circle([
        [49.48607440112652, 37.82508833417394],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }))
    .add(new ymaps.Circle([
        [50.43924295032115, 37.45155317792394],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }))
    .add(new ymaps.Circle([
        [50.41818940960799, 36.127700638861434],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }))
    .add(new ymaps.Circle([
        [51.042244697705975, 35.380630326361434],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }))
    .add(new ymaps.Circle([
        [51.73988453715531, 34.42481977948639],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }))
    .add(new ymaps.Circle([
        [52.33946866754581, 33.5019682169864],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }))
    .add(new ymaps.Circle([
        [52.103311101788705, 32.309951615423884],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }))
    .add(new ymaps.Circle([
        [52.06608581608206, 30.94764692792389],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }))
    .add(new ymaps.Circle([
        [51.497098062045204, 30.17311079511138],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }))
    .add(new ymaps.Circle([
        [51.56562072731797, 28.629531693548856],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }))
    .add(new ymaps.Circle([
        [51.7565209368633, 27.121818136718744],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }))
    .add(new ymaps.Circle([
        [51.91306479682364, 25.53429372265624],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }))
    .add(new ymaps.Circle([
        [51.646573712009335, 23.755722377174628],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }))
    .add(new ymaps.Circle([
        [50.818920388312016, 23.997421595924617],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }))
    .add(new ymaps.Circle([
        [50.107146169509164, 23.27232393967458],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }))
    .add(new ymaps.Circle([
        [49.17613503767301, 22.739487025612082],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }))
    .add(new ymaps.Circle([
        [48.32617633808894, 22.322006556862053],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }))
    .add(new ymaps.Circle([
        [47.9991003744313, 23.503036830299557],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }))
    .add(new ymaps.Circle([
        [47.74407998874915, 24.914779994362046],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }))
    .add(new ymaps.Circle([
        [48.05805525352261, 26.24412569748704],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }))
    .add(new ymaps.Circle([
        [48.461534605107694, 27.74925265061205],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }))
    .add(new ymaps.Circle([
        [47.9880387811728, 28.919296595924497],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }))
    .add(new ymaps.Circle([
        [47.11787646756795, 29.52903780686197],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }))
    .add(new ymaps.Circle([
        [46.294114178151624, 28.97422823654946],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }))
    .add(new ymaps.Circle([
        [45.49633539989261, 28.232651088111975],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }))
    .add(new ymaps.Circle([
        [45.24854351646408, 29.72679171311198],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }))
    .add(new ymaps.Circle([
        [46.14922725124197, 30.50132784592446],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }))
    .add(new ymaps.Circle([
        [46.647083031880854, 31.36375460373698],
        dist
    ], {
        balloonContent: "Радиус круга - 1000 км",
        hintContent: "ТУ 141 Стриж"
    }, {
        draggable: false,
        fillColor: "#DB709377",
        fillOpacity: opasity,
        strokeColor: "#990066",
        strokeOpacity: 0.8,
        strokeWidth: 5
    })); */

}