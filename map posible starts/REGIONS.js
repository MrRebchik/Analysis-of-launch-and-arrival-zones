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
                    quality: '3'
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
    //
    //
    //
    //
    //
    //
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
    //
    //
    //
    //
    //
    //

    
    var myCircle = new ymaps.Circle([
        [51.474959, 46.187740],
        1000000
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
    });
    var myCircle2 = new ymaps.Circle([
        [54.651495, 39.574247],
        1000000
    ], {
        // Описываем свойства круга.
        // Содержимое балуна.
        balloonContent: "Радиус круга - 1000 км",
        // Содержимое хинта.
        hintContent: "ТУ 141 Стриж"
    }, {
        // Задаем опции круга.
        // Включаем возможность перетаскивания круга.
        draggable: false,
        // Цвет заливки.
        // Последний байт (77) определяет прозрачность.
        // Прозрачность заливки также можно задать используя опцию "fillOpacity".
        fillColor: "#DB709377",
        // Цвет обводки.
        strokeColor: "#990066",
        fillOpacity: opasity,
        // Прозрачность обводки.
        strokeOpacity: 0.8,
        // Ширина обводки в пикселях.
        strokeWidth: 5
    });
    
    var myCircle3 = new ymaps.Circle([
        // Координаты центра круга.
        [53.934949, 37.928542],
        // Радиус круга в метрах.
        1000000
    ], {
        // Описываем свойства круга.
        // Содержимое балуна.
        balloonContent: "Радиус круга - 1000 км",
        // Содержимое хинта.
        hintContent: "ТУ 141 Стриж"
    }, {
        // Задаем опции круга.
        // Включаем возможность перетаскивания круга.
        draggable: false,
        // Цвет заливки.
        // Последний байт (77) определяет прозрачность.
        // Прозрачность заливки также можно задать используя опцию "fillOpacity".
        fillColor: "#DB709377",
        fillOpacity: opasity,
        // Цвет обводки.
        strokeColor: "#990066",
        // Прозрачность обводки.
        strokeOpacity: 0.8,
        // Ширина обводки в пикселях.
        strokeWidth: 5
    });
    var myCircle4 = new ymaps.Circle([
        // Координаты центра круга.
        [44.099843, 39.095848],
        // Радиус круга в метрах.
        1000000
    ], {
        // Описываем свойства круга.
        // Содержимое балуна.
        balloonContent: "Радиус круга - 1000 км",
        // Содержимое хинта.
        hintContent: "ТУ 141 Стриж"
    }, {
        // Задаем опции круга.
        // Включаем возможность перетаскивания круга.
        draggable: false,
        // Цвет заливки.
        // Последний байт (77) определяет прозрачность.
        // Прозрачность заливки также можно задать используя опцию "fillOpacity".
        fillColor: "#DB709377",
        fillOpacity: opasity,
        // Цвет обводки.
        strokeColor: "#990066",
        // Прозрачность обводки.
        strokeOpacity: 0.8,
        // Ширина обводки в пикселях.
        strokeWidth: 5
    });
    var myCircle5 = new ymaps.Circle([
        // Координаты центра круга.
        [45.005424, 38.976705],
        // Радиус круга в метрах.
        1000000
    ], {
        // Описываем свойства круга.
        // Содержимое балуна.
        balloonContent: "Радиус круга - 1000 км",
        // Содержимое хинта.
        hintContent: "ТУ 141 Стриж"
    }, {
        // Задаем опции круга.
        // Включаем возможность перетаскивания круга.
        draggable: false,
        // Цвет заливки.
        // Последний байт (77) определяет прозрачность.
        // Прозрачность заливки также можно задать используя опцию "fillOpacity".
        fillColor: "#DB709377",
        fillOpacity: opasity,
        // Цвет обводки.
        strokeColor: "#990066",
        // Прозрачность обводки.
        strokeOpacity: 0.8,
        // Ширина обводки в пикселях.
        strokeWidth: 5
    });
    var Tu = new Array(myCircle,myCircle2,myCircle3,myCircle4,myCircle5);
    var myCircle6 = new ymaps.Circle([
        // Координаты центра круга.
        [45.713348, 34.392872],
        // Радиус круга в метрах.
        900000
    ], {
        // Описываем свойства круга.
        // Содержимое балуна.
        balloonContent: "Радиус круга - 900 км",
        // Содержимое хинта.
        hintContent: "Мугин-5"
    }, {
        // Задаем опции круга.
        // Включаем возможность перетаскивания круга.
        draggable: false,
        // Цвет заливки.
        // Последний байт (77) определяет прозрачность.
        // Прозрачность заливки также можно задать используя опцию "fillOpacity".
        fillColor: "#5b7a1d",
        fillOpacity: opasity,
        // Цвет обводки.
        strokeColor: "#99ff66",
        // Прозрачность обводки.
        strokeOpacity: 0.8,
        // Ширина обводки в пикселях.
        strokeWidth: 5
    });
    var myCircle7 = new ymaps.Circle([
        // Координаты центра круга.
        [45.383643, 33.117076],
        // Радиус круга в метрах.
        900000
    ], {
        // Описываем свойства круга.
        // Содержимое балуна.
        balloonContent: "Радиус круга - 900 км",
        // Содержимое хинта.
        hintContent: "Мугин-5"
    }, {
        // Задаем опции круга.
        // Включаем возможность перетаскивания круга.
        draggable: false,
        // Цвет заливки.
        // Последний байт (77) определяет прозрачность.
        // Прозрачность заливки также можно задать используя опцию "fillOpacity".
        fillColor: "#5b7a1d",
        fillOpacity: opasity,
        // Цвет обводки.
        strokeColor: "#99ff66",
        // Прозрачность обводки.
        strokeOpacity: 0.8,
        // Ширина обводки в пикселях.
        strokeWidth: 5
    });
    var myCircle8 = new ymaps.Circle([
        // Координаты центра круга.
        [44.686576, 33.570838],
        // Радиус круга в метрах.
        900000
    ], {
        // Описываем свойства круга.
        // Содержимое балуна.
        balloonContent: "Радиус круга - 900 км",
        // Содержимое хинта.
        hintContent: "Мугин-5"
    }, {
        // Задаем опции круга.
        // Включаем возможность перетаскивания круга.
        draggable: false,
        // Цвет заливки.
        // Последний байт (77) определяет прозрачность.
        // Прозрачность заливки также можно задать используя опцию "fillOpacity".
        fillColor: "#5b7a1d",
        fillOpacity: opasity,
        // Цвет обводки.
        strokeColor: "#99ff66",
        // Прозрачность обводки.
        strokeOpacity: 0.8,
        // Ширина обводки в пикселях.
        strokeWidth: 5
    });
    var myCircle9 = new ymaps.Circle([
        [44.617879, 33.505980],
        900000
    ], {
        balloonContent: "Радиус круга - 900 км",
        hintContent: "Мугин-5"
    }, {
        draggable: false,
        fillColor: "#5b7a1d",
        fillOpacity: opasity,
        strokeColor: "#99ff66",
        strokeOpacity: 0.8,
        strokeWidth: 5

    });//
    //
    //
    //РАДИУСЫ ПРИЛЕТОВ ТУ141
    //
    //
    //
    map.geoObjects
    .add(new ymaps.Circle([
        [45.782794, 15.940538],
        1000000
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
    //
    //
    //
    //РАДИУСЫ ПРИЛЕТОВ UJ-22 Airborne
    //
    //
    //
    map.geoObjects
    .add(new ymaps.Circle([
        [55.409695, 38.807045],
        800000
    ], {
        balloonContent: "Радиус круга - 800 км",
        hintContent: "UJ-22 Airborne"
    }, {
        draggable: false,
        fillColor: "#d84b20",
        fillOpacity: opasity,
        strokeColor: "#d53e07",
        strokeOpacity: 0.8,
        strokeWidth: 5
    }));
    //
    //
    //
    //ТОЧКИ ПРИЛЕТОВ Skyeye
    //
    //
    //
    map.geoObjects
    .add(new ymaps.Circle([
        [54.248350, 34.377160],
        600000
    ], {
        balloonContent: "Радиус круга - 600 км",
        hintContent: "Skyeye"
    }, {
        draggable: false,
        fillColor: "#cd9575",
        fillOpacity: opasity,
        strokeColor: "#c1876b",
        strokeOpacity: 0.8,
        strokeWidth: 5
    })).add(new ymaps.Placemark([54.248350, 34.377160],{
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
    .add(new ymaps.Circle([
        [47.832619, 39.861856],
        500000
    ], {
        balloonContent: "Радиус круга - 600 км",
        hintContent: " Systems PD-1 "
    }, {
        draggable: false,
        fillColor: "#f80000",
        fillOpacity: opasity,
        strokeColor: "#f80000",
        strokeOpacity: 0.8,
        strokeWidth: 5
    })).add(new ymaps.Placemark([47.832619, 39.861856],{
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
    .add(new ymaps.Circle([
        [50.595414, 36.587277],
        50000
    ], {
        balloonContent: "Радиус круга - 50 км",
        hintContent: " Fly Eye  "
    }, {
        draggable: false,
        fillColor: "#7b917b",
        fillOpacity: opasity,
        strokeColor: "#7b917b",
        strokeOpacity: 0.8,
        strokeWidth: 5
    })).add(new ymaps.Placemark([50.595414, 36.587277],{
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


    var Mi = new Array( myCircle6, myCircle7, myCircle8, myCircle9);
    for (var i = 0; i < Tu.length; i++) {
        map.geoObjects.add(Tu[i]);
    }
    for (var i = 0; i < Mi.length; i++) {
        map.geoObjects.add(Mi[i]);
    }
    //
    //
    //
    //АЭРОПОРТЫ
    //
    //
    //
    map.geoObjects
    .add(new ymaps.GeoObject({
            geometry: {type: "Point",coordinates: [46.421810, 30.675527]},
            properties: {iconContent: 'Аэродром',} }, 
            {
            preset: 'islands#blueAirportCircleIcon',
            iconColor:'#0095b6',
            draggable: false}))
    .add(new ymaps.GeoObject({
            geometry: {type: "Point",coordinates: [46.575165, 30.699001]},
            properties: {iconContent: 'Аэродром',} }, 
            {
            preset: 'islands#blueAirportCircleIcon',
            iconColor:'#0095b6',
            draggable: false}))
    .add(new ymaps.GeoObject({
            geometry: {type: "Point",coordinates: [47.511599, 31.260484]},
            properties: {iconContent: 'Аэродром',} }, 
            {
            preset: 'islands#blueAirportCircleIcon',
            iconColor:'#0095b6',
            draggable: false}))
    .add(new ymaps.GeoObject({
            geometry: {type: "Point",coordinates: [47.913079, 30.828257]},
            properties: {iconContent: 'Аэродром',} }, 
            {
            preset: 'islands#blueAirportCircleIcon',
            iconColor:'#0095b6',
            draggable: false}))
    .add(new ymaps.GeoObject({
            geometry: {type: "Point",coordinates: [46.649133, 31.553694]},
            properties: {iconContent: 'Аэродром',} }, 
            {
            preset: 'islands#blueAirportCircleIcon',
            iconColor:'#0095b6',
            draggable: false}))
    .add(new ymaps.GeoObject({
            geometry: {type: "Point",coordinates: [46.894790, 30.697731]},
            properties: {iconContent: 'Аэродром',} }, 
            {
            preset: 'islands#blueAirportCircleIcon',
            iconColor:'#0095b6',
            draggable: false}))
    .add(new ymaps.GeoObject({
            geometry: {type: "Point",coordinates: [46.936840, 32.099180]},
            properties: {iconContent: 'Аэродром',} }, 
            {
            preset: 'islands#blueAirportCircleIcon',
            iconColor:'#0095b6',
            draggable: false}))
    .add(new ymaps.GeoObject({
            geometry: {type: "Point",coordinates: [48.376680, 29.504205]},
            properties: {iconContent: 'Аэродром',} }, 
            {
            preset: 'islands#blueAirportCircleIcon',
            iconColor:'#0095b6',
            draggable: false}))
    .add(new ymaps.GeoObject({
            geometry: {type: "Point",coordinates: [49.841056, 36.645161]},
            properties: {iconContent: 'Аэродром',} }, 
            {
            preset: 'islands#blueAirportCircleIcon',
            iconColor:'#0095b6',
            draggable: false}))
    .add(new ymaps.GeoObject({
            geometry: {type: "Point",coordinates: [49.975329, 36.015615]},
            properties: {iconContent: 'Аэродром',} }, 
            {
            preset: 'islands#blueAirportCircleIcon',
            iconColor:'#0095b6',
            draggable: false}))
    .add(new ymaps.GeoObject({
            geometry: {type: "Point",coordinates: [49.934151, 33.647446]},
            properties: {iconContent: 'Аэродром',} }, 
            {
            preset: 'islands#blueAirportCircleIcon',
            iconColor:'#0095b6',
            draggable: false}))
    .add(new ymaps.GeoObject({
            geometry: {type: "Point",coordinates: [49.627104, 34.489607]},
            properties: {iconContent: 'Аэродром',} }, 
            {
            preset: 'islands#blueAirportCircleIcon',
            iconColor:'#0095b6',
            draggable: false}))
    .add(new ymaps.GeoObject({
            geometry: {type: "Point",coordinates: [48.540511, 35.106445]},
            properties: {iconContent: 'Аэродром',} }, 
            {
            preset: 'islands#blueAirportCircleIcon',
            iconColor:'#0095b6',
            draggable: false}))
    .add(new ymaps.GeoObject({
            geometry: {type: "Point",coordinates: [48.817166, 37.652664]},
            properties: {iconContent: 'Аэродром',} }, 
            {
            preset: 'islands#blueAirportCircleIcon',
            iconColor:'#0095b6',
            draggable: false}))
    .add(new ymaps.GeoObject({
            geometry: {type: "Point",coordinates: [48.528027, 25.125053]},
            properties: {iconContent: 'Аэродром',} }, 
            {
            preset: 'islands#blueAirportCircleIcon',
            iconColor:'#0095b6',
            draggable: false}))
    .add(new ymaps.GeoObject({
            geometry: {type: "Point",coordinates: [49.244576, 23.788764]},
            properties: {iconContent: 'Аэродром',} }, 
            {
            preset: 'islands#blueAirportCircleIcon',
            iconColor:'#0095b6',
            draggable: false}))
    .add(new ymaps.GeoObject({
            geometry: {type: "Point",coordinates: [49.824827, 23.694168]},
            properties: {iconContent: 'Аэродром',} }, 
            {
            preset: 'islands#blueAirportCircleIcon',
            iconColor:'#0095b6',
            draggable: false}))
    .add(new ymaps.GeoObject({
            geometry: {type: "Point",coordinates: [48.885548, 24.703191]},
            properties: {iconContent: 'Аэродром',} }, 
            {
            preset: 'islands#blueAirportCircleIcon',
            iconColor:'#0095b6',
            draggable: false}))
    .add(new ymaps.GeoObject({
            geometry: {type: "Point",coordinates: [49.826342, 23.688843]},
            properties: {iconContent: 'Аэродром',} }, 
            {
            preset: 'islands#blueAirportCircleIcon',
            iconColor:'#0095b6',
            draggable: false}))
    .add(new ymaps.GeoObject({
            geometry: {type: "Point",coordinates: [50.377335, 23.963918]},
            properties: {iconContent: 'Аэродром',} }, 
            {
            preset: 'islands#blueAirportCircleIcon',
            iconColor:'#0095b6',
            draggable: false}))
    .add(new ymaps.GeoObject({
            geometry: {type: "Point",coordinates: [50.628338, 24.231925]},
            properties: {iconContent: 'Аэродром',} }, 
            {
            preset: 'islands#blueAirportCircleIcon',
            iconColor:'#0095b6',
            draggable: false}))
    .add(new ymaps.GeoObject({
            geometry: {type: "Point",coordinates: [50.639209, 24.506863]},
            properties: {iconContent: 'Аэродром',} }, 
            {
            preset: 'islands#blueAirportCircleIcon',
            iconColor:'#0095b6',
            draggable: false}))
    .add(new ymaps.GeoObject({
            geometry: {type: "Point",coordinates: [51.086543, 24.973638]},
            properties: {iconContent: 'Аэродром',} }, 
            {
            preset: 'islands#blueAirportCircleIcon',
            iconColor:'#0095b6',
            draggable: false}));


   

}